import { ORPCError } from "@orpc/client";
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
			imageCount: z.number().int().positive().max(10).optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const { imageId, imageCount } = input;
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

		// Ensure the user has at least 1 credit before triggering the task
		const creditBalance = await prisma.creditBalance.findUnique({
			where: { userId: user.id },
		});

		if (!creditBalance || creditBalance.balance < 1) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Insufficient credits to restore photo",
			});
		}

		const resolvedImageCount =
			imageCount ?? Number.parseInt(process.env.RESTORATION_IMAGE_COUNT || "3", 10);

		// Start the background task
		const handle = await restoreImageTask.trigger({
			imageId: image.id,
			imageCount: resolvedImageCount,
		});

			return {
				handle: handle.id,
			};
		});
