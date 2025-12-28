import { db } from "@repo/database";
import { z } from "zod";
import { protectedProcedure } from "../../../orpc/procedures";

export const getTransactions = protectedProcedure
	.route({
		method: "GET",
		path: "/credits/transactions",
		tags: ["Credits"],
		summary: "Get credit transactions",
		description: "Get the credit transaction history for the authenticated user",
	})
	.input(
		z
			.object({
				limit: z.number().min(1).max(100).default(20),
				cursor: z.string().optional(),
			})
			.optional(),
	)
	.handler(async ({ input, context: { user } }) => {
		const limit = input?.limit ?? 20;
		const cursor = input?.cursor;

		const transactions = await db.creditTransaction.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: "desc" },
			take: limit + 1,
			...(cursor && {
				cursor: { id: cursor },
				skip: 1,
			}),
		});

		let nextCursor: string | undefined;
		if (transactions.length > limit) {
			const nextItem = transactions.pop();
			nextCursor = nextItem?.id;
		}

		return {
			transactions,
			nextCursor,
		};
	});
