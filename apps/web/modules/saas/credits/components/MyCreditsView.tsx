"use client";

import type { CreditTransactionType } from "@repo/database/prisma/generated/client";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CreditBalance } from "./CreditBalance";
import { CreditTopupDialog } from "./CreditTopupDialog";
import { CreditTransactionHistory } from "./CreditTransactionHistory";

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

	useEffect(() => {
		if (allTransactions.length) return;
		if (!transactionsQuery.data?.nextCursor) return;
		setCursor(transactionsQuery.data.nextCursor);
	}, [allTransactions.length, transactionsQuery.data?.nextCursor]);

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

	const handleTopupClick = () => {
		setIsTopupOpen(true);
	};

	const transactions =
		allTransactions.length > 0
			? allTransactions
			: transactionsQuery.data?.transactions ?? [];

	return (
		<div className="flex flex-col gap-6">
			<CreditBalance
				balance={balanceQuery.data?.balance ?? 0}
				updatedAt={
					balanceQuery.data?.updatedAt
						? balanceQuery.data.updatedAt.toString()
						: null
				}
				onTopup={handleTopupClick}
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

interface CreditTransaction {
	id: string;
	type: CreditTransactionType;
	amount: number;
	balanceAfter: number;
	reason: string | null;
	createdAt: Date;
}
