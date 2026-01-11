import { getRestorationVariantId, restoreImage } from "@repo/ai/lib/restore";
import { db as prisma } from "@repo/database";
import { getSignedUrl, uploadFile } from "@repo/storage";
import { task } from "@trigger.dev/sdk/v3";

export const restoreImageTask = task({
	id: "restore-image",
	run: async (payload: {
		imageId: string;
		imageCount?: number;
		resolution?: RestorationResolution;
	}) => {
		const { imageId, imageCount: inputImageCount, resolution } = payload;
		console.log("[restore-image] Task started", { imageId });

		const bucket = process.env.NEXT_PUBLIC_PHOTO_RESTORATION_BUCKET_NAME;

		if (!bucket) {
			console.error("[restore-image] Missing bucket configuration");
			throw new Error(
				"Missing NEXT_PUBLIC_PHOTO_RESTORATION_BUCKET_NAME",
			);
		}

		// Get the number of images to generate (payload overrides env default)
		const envDefault = Number.parseInt(
			process.env.RESTORATION_IMAGE_COUNT || "3",
			10,
		);
		const imageCount =
			typeof inputImageCount === "number" && inputImageCount > 0
				? inputImageCount
				: envDefault;
		const outputResolution = resolution ?? defaultRestorationResolution;
		const creditsRequired = getRestorationCredits(outputResolution);
		console.log("[restore-image] Configuration", {
			bucket,
			imageCount,
			outputResolution,
			creditsRequired,
		});

		// 1. Fetch the Image record from database
		console.log("[restore-image] Fetching image record from database");
		const imageRecord = await prisma.image.findUnique({
			where: { id: imageId },
		});

		if (!imageRecord) {
			console.error("[restore-image] Image not found", { imageId });
			throw new Error(`Image not found: ${imageId}`);
		}

		const { userId, originalUrl: imageKey } = imageRecord;
		console.log("[restore-image] Image record found", {
			userId,
			imageKey,
		});

		// 2. Create RestoredImage records (PENDING) - one for each image to generate
		console.log(
			`[restore-image] Creating ${imageCount} RestoredImage records`,
		);
		const restoredRecords = await Promise.all(
			Array.from({ length: imageCount }, () =>
				prisma.restoredImage.create({
					data: {
						imageId: imageRecord.id,
						status: "PENDING",
					},
				}),
			),
		);
		console.log("[restore-image] RestoredImage records created", {
			count: restoredRecords.length,
			ids: restoredRecords.map((r) => r.id),
		});

		try {
			// 3. Get signed URL to download the image from S3
			console.log("[restore-image] Generating signed download URL");
			const signedDownloadUrl = await getSignedUrl(imageKey, {
				bucket,
				expiresIn: 300, // 5 minutes
			});
			console.log("[restore-image] Signed URL generated", {
				urlDomain: new URL(signedDownloadUrl).hostname,
			});

			// 4. Download the image from S3
			console.log("[restore-image] Downloading image from S3");
			const response = await fetch(signedDownloadUrl);
			if (!response.ok) {
				console.error("[restore-image] Failed to download from S3", {
					status: response.status,
					statusText: response.statusText,
				});
				throw new Error(
					`Failed to download image from S3: ${response.statusText}`,
				);
			}

			const arrayBuffer = await response.arrayBuffer();
			const imageBuffer = Buffer.from(arrayBuffer);
			console.log("[restore-image] Image downloaded", {
				size: imageBuffer.length,
			});

			// Determine mime type from the response or use a default
			const mimeType =
				response.headers.get("content-type") || "image/jpeg";
			console.log("[restore-image] Detected MIME type", { mimeType });

			// 5. Restore the image multiple times in parallel
			const shouldReturnMockResult =
				(process.env.RETURN_MOCK_RESULT ?? "false") === "true";
			console.log(
				`[restore-image] Starting ${imageCount} AI restoration(s) in parallel${shouldReturnMockResult ? " (MOCK MODE)" : ""}`,
			);

			const restorationPromises = restoredRecords.map(
				async (restoredRecord, index) => {
					const variantId = getRestorationVariantId(index);
					console.log(
						`[restore-image] Starting restoration ${index + 1}/${imageCount}`,
						{
							restoredImageId: restoredRecord.id,
							mode: shouldReturnMockResult ? "mock" : "real",
							variantId,
						},
					);

					try {
						let restoredBuffer: Buffer;

						if (shouldReturnMockResult) {
							// Use the mock result image instead of calling Gemini
							console.log(
								"[restore-image] Using mock result (RETURN_MOCK_RESULT=true)",
							);
							const fs = await import("fs/promises");
							const path = await import("path");

							// Path to the mock result image
							const mockImagePath = path.join(
								process.cwd(),
								"../../apps/web/public/images/restore-image.png",
							);

							restoredBuffer = await fs.readFile(mockImagePath);
							console.log(
								`[restore-image] Mock image loaded from ${mockImagePath}`,
								{
									size: restoredBuffer.length,
								},
							);
						} else {
							// In production, use real AI restoration
							restoredBuffer = await restoreImage(
								imageBuffer,
								mimeType,
								{ variantId, resolution: outputResolution },
							);
						}

						console.log(
							`[restore-image] Restoration ${index + 1}/${imageCount} complete`,
							{
								restoredImageId: restoredRecord.id,
								originalSize: imageBuffer.length,
								restoredSize: restoredBuffer.length,
							},
						);

						// 6. Upload restored image to S3
						const restoredKey = `users/${userId}/restored/${restoredRecord.id}`;
						const restoredMime = "image/png";
						console.log(
							`[restore-image] Uploading restored image ${index + 1}/${imageCount} to S3`,
							{
								restoredKey,
							},
						);
						await uploadFile(
							restoredKey,
							restoredBuffer,
							restoredMime,
							{
								bucket,
							},
						);
						console.log(
							`[restore-image] Restored image ${index + 1}/${imageCount} uploaded successfully`,
						);

						// 7. Update RestoredImage record
						console.log(
							`[restore-image] Updating RestoredImage ${index + 1}/${imageCount} status to COMPLETED`,
						);
						await prisma.restoredImage.update({
							where: { id: restoredRecord.id },
							data: {
								status: "COMPLETED",
								fileUrl: restoredKey,
							},
						});

						return {
							restoredImageId: restoredRecord.id,
							restoredUrl: restoredKey,
							restoredImageBase64:
								restoredBuffer.toString("base64"),
						};
					} catch (error) {
						console.error(
							`[restore-image] Restoration ${index + 1}/${imageCount} failed`,
							{
								error:
									error instanceof Error
										? error.message
										: String(error),
								restoredImageId: restoredRecord.id,
							},
						);

						// Mark this specific restoration as failed
						await prisma.restoredImage.update({
							where: { id: restoredRecord.id },
							data: {
								status: "FAILED",
							},
						});

						throw error;
					}
				},
			);

			// Wait for all restorations to complete
			const results = await Promise.all(restorationPromises);

			console.log(
				"[restore-image] All restorations completed successfully",
				{
					imageId: imageRecord.id,
					count: results.length,
				},
			);

			// Consume credits after successful generation
			await prisma.$transaction(async (tx) => {
				const balance = await tx.creditBalance.upsert({
					where: { userId },
					create: { userId, balance: 0 },
					update: {},
				});

				if (balance.balance < creditsRequired) {
					throw new Error("Insufficient credits");
				}

				const updatedBalance = await tx.creditBalance.update({
					where: { userId },
					data: {
						balance: { decrement: creditsRequired },
					},
				});

				await tx.creditTransaction.create({
					data: {
						userId,
						type: "CONSUMPTION",
						amount: creditsRequired,
						balanceAfter: updatedBalance.balance,
						reason: "Photo restoration",
						relatedEntityId: imageRecord.id,
						relatedEntityType: "IMAGE",
						metadata: {
							imageCount: results.length,
							outputResolution,
							creditsUsed: creditsRequired,
						},
					},
				});
			});

			return {
				imageId: imageRecord.id,
				originalUrl: imageKey,
				count: results.length,
				restorations: results,
			};
		} catch (error) {
			console.error("[restore-image] Task failed", {
				error: error instanceof Error ? error.message : String(error),
			});

			// Mark all pending records as failed
			await Promise.all(
				restoredRecords.map((record) =>
					prisma.restoredImage.update({
						where: { id: record.id },
						data: {
							status: "FAILED",
						},
					}),
				),
			);

			try {
				const userRecord = await prisma.user.findUnique({
					where: { id: userId },
					select: { id: true, email: true, name: true },
				});

				if (userRecord?.email) {
					await sendSupportFailureEmail({
						to: "support@photorestoration.photo",
						subject: `Photo restoration failed: ${userRecord.email}`,
						text: formatRestoreFailureText({
							userId: userRecord.id,
							email: userRecord.email,
							name: userRecord.name ?? "Unknown",
						}),
					});
				}
			} catch (notificationError) {
				console.error("[restore-image] Failed to send failure email", {
					error:
						notificationError instanceof Error
							? notificationError.message
							: String(notificationError),
				});
			}

			throw error;
		}
	},
});

function formatRestoreFailureText(params: {
	userId: string;
	email: string;
	name: string;
}) {
	const { userId, email, name } = params;
	return [
		"Photo restoration failed",
		`Email: ${email}`,
		`Name: ${name}`,
		`User ID: ${userId}`,
	].join("\n");
}

async function sendSupportFailureEmail(params: {
	to: string;
	subject: string;
	text: string;
}) {
	const { to, subject, text } = params;
	const response = await fetch("https://api.useplunk.com/v1/send", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.PLUNK_API_KEY}`,
		},
		body: JSON.stringify({
			to,
			subject,
			body: text,
			text,
		}),
	});

	if (!response.ok) {
		console.error("[restore-image] Failed to send failure email", {
			status: response.status,
			statusText: response.statusText,
		});
	}
}

const restorationResolutionIds = ["1k", "2k", "4k"] as const;

type RestorationResolution = (typeof restorationResolutionIds)[number];

const defaultRestorationResolution: RestorationResolution = "1k";

const restorationResolutionCredits: Record<RestorationResolution, number> = {
	"1k": 1,
	"2k": 2,
	"4k": 3,
};

function getRestorationCredits(resolution: RestorationResolution): number {
	return restorationResolutionCredits[resolution];
}
