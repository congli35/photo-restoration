import { ORPCError } from "@orpc/client";
import { db as prisma } from "@repo/database";
import { sendEmail } from "@repo/mail";
import { restoreImageTask } from "@repo/tasks";
import {
	defaultRestorationResolution,
	getRestorationCredits,
	restorationResolutionIds,
} from "@repo/utils";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";

function formatRestoreConfirmationText(params: {
	userId: string;
	email: string;
	name: string;
}) {
	const { userId, email, name } = params;
	return [
		"User confirmed photo restoration",
		`Email: ${email}`,
		`Name: ${name}`,
		`User ID: ${userId}`,
	].join("\n");
}

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
			resolution: z
				.enum(restorationResolutionIds)
				.default(defaultRestorationResolution),
		}),
	)
	.handler(async ({ input, context }) => {
		const { imageId, imageCount, resolution } = input;
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

		// Ensure the user has enough credits before triggering the task
		const creditBalance = await prisma.creditBalance.findUnique({
			where: { userId: user.id },
		});

		const requiredCredits = getRestorationCredits(resolution);

		if (!creditBalance || creditBalance.balance < requiredCredits) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Insufficient credits to restore photo. ${requiredCredits} credit${requiredCredits === 1 ? "" : "s"} required.`,
			});
		}

		if (user.email) {
			await sendEmail({
				to: "support@photorestoration.photo",
				subject: `Photo restoration confirmed: ${user.email}`,
				text: formatRestoreConfirmationText({
					userId: user.id,
					email: user.email,
					name: user.name ?? "Unknown",
				}),
			});
		}

		const resolvedImageCount =
			imageCount ??
			Number.parseInt(process.env.RESTORATION_IMAGE_COUNT || "3", 10);

		// Start the background task
		const handle = await restoreImageTask.trigger({
			imageId: image.id,
			imageCount: resolvedImageCount,
			resolution,
		});

		return {
			handle: handle.id,
		};
	});
