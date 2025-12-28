import { db } from "@repo/database";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";

export const topupCredits = protectedProcedure
	.route({
		method: "POST",
		path: "/credits/topup",
		tags: ["Credits"],
		summary: "Topup credits",
		description: "Add credits to the authenticated user's account",
	})
	.input(
		z.object({
			amount: z.number().int().positive(),
			reason: z.string().optional(),
		}),
	)
	.handler(async ({ input: { amount, reason }, context: { user } }) => {
		const result = await db.$transaction(async (tx) => {
			// Get or create credit balance
			let creditBalance = await tx.creditBalance.findUnique({
				where: { userId: user.id },
			});

			if (!creditBalance) {
				creditBalance = await tx.creditBalance.create({
					data: {
						userId: user.id,
						balance: 0,
					},
				});
			}

			const newBalance = creditBalance.balance + amount;

			// Update balance
			const updatedBalance = await tx.creditBalance.update({
				where: { userId: user.id },
				data: { balance: newBalance },
			});

			// Record transaction
			const transaction = await tx.creditTransaction.create({
				data: {
					userId: user.id,
					type: "TOPUP",
					amount,
					balanceAfter: newBalance,
					reason: reason ?? "Credit topup",
				},
			});

			return { balance: updatedBalance, transaction };
		});

		return {
			balance: result.balance.balance,
			transaction: result.transaction,
		};
	});
