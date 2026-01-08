import { ORPCError } from "@orpc/client";
import { db as prisma } from "@repo/database";
import { deleteFiles } from "@repo/storage";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";

export const deleteImageProcedure = protectedProcedure
	.route({
		method: "DELETE",
		path: "/ai/images/{id}",
		tags: ["AI"],
		summary: "Delete image",
		description: "Delete a photo and its restorations",
	})
	.input(
		z.object({
			id: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		const bucket = process.env.NEXT_PUBLIC_PHOTO_RESTORATION_BUCKET_NAME;

		if (!bucket) {
			throw new Error("Missing NEXT_PUBLIC_PHOTO_RESTORATION_BUCKET_NAME");
		}

		const image = await prisma.image.findFirst({
			where: {
				id: input.id,
				userId: context.user.id,
			},
			include: {
				restorations: true,
			},
		});

		if (!image) {
			throw new ORPCError("NOT_FOUND");
		}

		const fileKeys = [
			image.originalUrl,
			...image.restorations.map((restoration) => restoration.fileUrl),
		].filter(Boolean) as string[];

		await deleteFiles(fileKeys, { bucket });

		await prisma.image.delete({
			where: {
				id: image.id,
			},
		});

		return { success: true };
	});
