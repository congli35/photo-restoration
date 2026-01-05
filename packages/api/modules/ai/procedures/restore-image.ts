import { restoreImageTask } from "@repo/tasks";
import { db as prisma } from "@repo/database";
import { uploadFile } from "@repo/storage";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";

export const restoreImageProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/ai/restore",
		tags: ["AI"],
		summary: "Restore image",
		description: "Restore an uploaded image",
	})
	.input(
		z.object({
			image: z.string().transform((str) => Buffer.from(str, "base64")),
			mimeType: z.string().default("image/png"),
		}),
	)
	.handler(async ({ input, context }) => {
		const { image, mimeType } = input;
		const { user } = context;
		const bucket = process.env.NEXT_PUBLIC_PHOTO_RESTORATION_BUCKET_NAME;

		if (!bucket) {
			throw new Error(
				"Missing NEXT_PUBLIC_PHOTO_RESTORATION_BUCKET_NAME",
			);
		}

		const imageRecord = await prisma.image.create({
			data: {
				userId: user.id,
				originalUrl: "",
			},
		});

		const imageKey = `users/${user.id}/images/${imageRecord.id}`;

		await prisma.image.update({
			where: { id: imageRecord.id },
			data: { originalUrl: imageKey },
		});

		await uploadFile(imageKey, image, mimeType, { bucket });

		// Start the background task
		const handle = await restoreImageTask.trigger({
			imageId: imageRecord.id,
		});

		return {
			handle: handle.id,
		};
	});
