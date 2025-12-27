import { db as prisma } from "@repo/database";
import { getSignedUploadUrl } from "@repo/storage";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";

export const createImageUploadUrl = protectedProcedure
	.route({
		method: "POST",
		path: "/ai/image-upload-url",
		tags: ["AI"],
		summary: "Create image upload URL",
		description:
			"Create a signed upload URL to upload an image for restoration and create the image record",
	})
	.input(
		z.object({
			mimeType: z.string().default("image/jpeg"),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		const bucket = process.env.NEXT_PUBLIC_PHOTO_RESTORATION_BUCKET_NAME;

		if (!bucket) {
			throw new Error(
				"Missing NEXT_PUBLIC_PHOTO_RESTORATION_BUCKET_NAME",
			);
		}

		console.log("[create-image-upload-url] Creating signed URL", {
			bucket,
			userId: user.id,
			mimeType: input.mimeType,
		});

		// Create the image record first
		const imageRecord = await prisma.image.create({
			data: {
				userId: user.id,
				originalUrl: "", // Will be updated with the actual key after upload
			},
		});

		// Generate S3 key for the image
		const imageKey = `users/${user.id}/images/${imageRecord.id}`;

		// Update the image record with the actual key
		await prisma.image.update({
			where: { id: imageRecord.id },
			data: { originalUrl: imageKey },
		});

		console.log("[create-image-upload-url] Generating signed URL", {
			imageKey,
			imageId: imageRecord.id,
		});

		// Generate signed upload URL with the correct content type
		const signedUploadUrl = await getSignedUploadUrl(imageKey, {
			bucket,
			contentType: input.mimeType,
		});

		console.log("[create-image-upload-url] Signed URL generated", {
			imageId: imageRecord.id,
			urlLength: signedUploadUrl.length,
		});

		return {
			signedUploadUrl,
			imageId: imageRecord.id,
			imageKey,
		};
	});
