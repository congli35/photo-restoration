import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import type { Prisma } from "@repo/database/prisma/generated/client";

interface ConsumeCreditsParams {
	userId: string;
	amount: number;
	reason?: string;
	relatedEntityId?: string;
	relatedEntityType?: string;
	metadata?: Prisma.JsonValue;
}

export async function consumeCredits({
	userId,
	amount,
	reason,
	relatedEntityId,
	relatedEntityType,
	metadata,
}: ConsumeCreditsParams) {
	if (amount <= 0) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Consumption amount must be positive",
		});
	}

	return await db.$transaction(async (tx) => {
		const creditBalance = await tx.creditBalance.upsert({
			where: { userId },
			create: { userId, balance: 0 },
			update: {},
		});

		if (creditBalance.balance < amount) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Insufficient credits",
			});
		}

		const updatedBalance = await tx.creditBalance.update({
			where: { userId },
			data: {
				balance: {
					decrement: amount,
				},
			},
		});

		const transaction = await tx.creditTransaction.create({
			data: {
				userId,
				type: "CONSUMPTION",
				amount,
				balanceAfter: updatedBalance.balance,
				reason: reason ?? "Credit consumption",
				relatedEntityId,
				relatedEntityType,
				...(metadata ? { metadata } : {}),
			},
		});

		return {
			balance: updatedBalance.balance,
			transaction,
		};
	});
}
