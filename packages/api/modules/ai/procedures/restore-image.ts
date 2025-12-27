import { restoreImageTask } from "@repo/tasks";
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

		// Start the background task
		const handle = await restoreImageTask.trigger({
			userId: user.id,
			image: image.toString("base64"),
			mimeType,
		});

		return {
			handle: handle.id,
		};
	});
