import { db } from "@repo/database";
import { protectedProcedure } from "../../../orpc/procedures";

export const getBalance = protectedProcedure
	.route({
		method: "GET",
		path: "/credits/balance",
		tags: ["Credits"],
		summary: "Get credit balance",
		description: "Get the current credit balance for the authenticated user",
	})
	.handler(async ({ context: { user } }) => {
		const creditBalance = await db.creditBalance.findUnique({
			where: { userId: user.id },
		});

		return {
			balance: creditBalance?.balance ?? 0,
			updatedAt: creditBalance?.updatedAt ?? null,
		};
	});
