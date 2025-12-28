"use client";

import type { CreditTransactionType } from "@repo/database/prisma/generated/client";
import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import { cn } from "@ui/lib";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	HistoryIcon,
	RefreshCwIcon,
	SettingsIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface CreditTransaction {
	id: string;
	type: CreditTransactionType;
	amount: number;
	balanceAfter: number;
	reason: string | null;
	createdAt: Date;
}

interface CreditTransactionHistoryProps {
	transactions: CreditTransaction[];
	hasMore: boolean;
	onLoadMore: () => void;
	isLoading: boolean;
}

const typeIcons: Record<CreditTransactionType, typeof ArrowUpIcon> = {
	TOPUP: ArrowUpIcon,
	CONSUMPTION: ArrowDownIcon,
	REFUND: RefreshCwIcon,
	ADJUSTMENT: SettingsIcon,
};

const typeColors: Record<CreditTransactionType, string> = {
	TOPUP: "text-green-500",
	CONSUMPTION: "text-red-500",
	REFUND: "text-blue-500",
	ADJUSTMENT: "text-yellow-500",
};

export function CreditTransactionHistory({
	transactions,
	hasMore,
	onLoadMore,
	isLoading,
}: CreditTransactionHistoryProps) {
	const t = useTranslations();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<HistoryIcon className="size-5 text-primary" />
					{t("credits.history.title")}
				</CardTitle>
				<CardDescription>
					{t("credits.subtitle")}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{transactions.length === 0 ? (
					<div className="py-8 text-center text-muted-foreground">
						{t("credits.history.empty")}
					</div>
				) : (
					<div className="space-y-4">
						{transactions.map((transaction) => {
							const Icon = typeIcons[transaction.type];
							const colorClass = typeColors[transaction.type];
							const isPositive =
								transaction.type === "TOPUP" ||
								transaction.type === "REFUND";

							return (
								<div
									key={transaction.id}
									className="flex items-center justify-between rounded-lg border p-4"
								>
									<div className="flex items-center gap-4">
										<div
											className={cn(
												"flex size-10 items-center justify-center rounded-full bg-muted",
												colorClass,
											)}
										>
											<Icon className="size-5" />
										</div>
										<div>
											<div className="font-medium">
												{t(
													`credits.history.types.${transaction.type}`,
												)}
											</div>
											{transaction.reason && (
												<div className="text-sm text-muted-foreground">
													{transaction.reason}
												</div>
											)}
											<div className="text-xs text-muted-foreground">
												{new Date(
													transaction.createdAt,
												).toLocaleString()}
											</div>
										</div>
									</div>
									<div className="text-right">
										<div
											className={cn(
												"font-semibold",
												isPositive
													? "text-green-500"
													: "text-red-500",
											)}
										>
											{isPositive ? "+" : ""}
											{transaction.amount}
										</div>
										<div className="text-xs text-muted-foreground">
											Balance: {transaction.balanceAfter}
										</div>
									</div>
								</div>
							);
						})}

						{hasMore && (
							<div className="flex justify-center pt-4">
								<Button
									variant="outline"
									onClick={onLoadMore}
									loading={isLoading}
								>
									{t("credits.history.loadMore")}
								</Button>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
