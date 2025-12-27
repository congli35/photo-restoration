import { db as prisma } from "@repo/database";
import { restoreImageTask } from "@repo/tasks";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";

export const triggerRestorationProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/ai/trigger-restoration",
		tags: ["AI"],
		summary: "Trigger photo restoration",
		description: "Trigger restoration task for an uploaded image",
	})
	.input(
		z.object({
			imageId: z.string(),
		}),
	)
	.handler(async ({ input, context }) => {
		const { imageId } = input;
		const { user } = context;

		// Verify the image belongs to the user
		const image = await prisma.image.findFirst({
			where: {
				id: imageId,
				userId: user.id,
			},
		});

		if (!image) {
			throw new Error("Image not found");
		}

		// Start the background task
		const handle = await restoreImageTask.trigger({
			imageId: image.id,
		});

		return {
			handle: handle.id,
		};
	});
