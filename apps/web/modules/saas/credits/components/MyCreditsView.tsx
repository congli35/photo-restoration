"use client";

import type { CreditTransactionType } from "@repo/database/prisma/generated/client";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CreditBalance } from "./CreditBalance";
import { CreditTopupDialog } from "./CreditTopupDialog";
import { CreditTransactionHistory } from "./CreditTransactionHistory";

interface CreditTransaction {
	id: string;
	type: CreditTransactionType;
	amount: number;
	balanceAfter: number;
	reason: string | null;
	createdAt: Date;
}

export function MyCreditsView() {
	const [isTopupOpen, setIsTopupOpen] = useState(false);
	const [allTransactions, setAllTransactions] = useState<CreditTransaction[]>(
		[],
	);
	const [cursor, setCursor] = useState<string | undefined>();
	const [hasMore, setHasMore] = useState(true);

	const balanceQuery = useQuery({
		...orpc.credits.balance.queryOptions(),
		queryKey: ["credits", "balance"],
	});

	const transactionsQuery = useQuery({
		...orpc.credits.transactions.queryOptions({}),
		queryKey: ["credits", "transactions"],
	});

	const handleLoadMore = async () => {
		if (!cursor || !hasMore) return;

		const result = await orpc.credits.transactions.call({
			limit: 20,
			cursor,
		});

		setAllTransactions((prev) => [...prev, ...result.transactions]);
		setCursor(result.nextCursor);
		setHasMore(!!result.nextCursor);
	};

	const transactions =
		allTransactions.length > 0
			? allTransactions
			: transactionsQuery.data?.transactions ?? [];

	if (!allTransactions.length && transactionsQuery.data?.nextCursor) {
		setCursor(transactionsQuery.data.nextCursor);
	}

	return (
		<div className="flex flex-col gap-6">
			<CreditBalance
				balance={balanceQuery.data?.balance ?? 0}
				updatedAt={
					balanceQuery.data?.updatedAt
						? balanceQuery.data.updatedAt.toString()
						: null
				}
				onTopup={() => setIsTopupOpen(true)}
			/>

			<CreditTransactionHistory
				transactions={transactions}
				hasMore={hasMore && !!cursor}
				onLoadMore={handleLoadMore}
				isLoading={transactionsQuery.isLoading}
			/>

			<CreditTopupDialog
				open={isTopupOpen}
				onOpenChange={setIsTopupOpen}
			/>
		</div>
	);
}
