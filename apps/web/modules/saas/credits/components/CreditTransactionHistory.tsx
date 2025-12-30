"use client";

import type { CreditTransactionType } from "@repo/database/prisma/generated/client";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Skeleton } from "@ui/components/skeleton";
import { cn } from "@ui/lib";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	HistoryIcon,
	RefreshCwIcon,
	SettingsIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

export function CreditTransactionHistory({
	transactions,
	hasMore,
	onLoadMore,
	isLoading,
}: CreditTransactionHistoryProps) {
	const t = useTranslations();
	const [typeFilter, setTypeFilter] = useState<TransactionFilterType>("ALL");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const isFiltering = typeFilter !== "ALL" || startDate !== "" || endDate !== "";

	const filteredTransactions = useMemo(() => {
		if (!isFiltering) return transactions;

		const { start, end } = getDateRange(startDate, endDate);

		return transactions.filter((transaction) => {
			if (typeFilter !== "ALL" && transaction.type !== typeFilter) {
				return false;
			}

			if (!start && !end) return true;

			const createdAt = new Date(transaction.createdAt);
			if (start && createdAt < start) return false;
			if (end && createdAt > end) return false;

			return true;
		});
	}, [endDate, startDate, transactions, typeFilter]);

	const displayTransactions = isFiltering ? filteredTransactions : transactions;
	const hasTransactions = displayTransactions.length > 0;
	const isInitialLoading = isLoading && transactions.length === 0;

	return (
		<Card className="relative overflow-hidden border-border/70">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_120%_-20%,rgba(78,109,245,0.12),transparent_60%)]" />
			<CardHeader className="relative">
				<div className="flex items-center gap-3">
					<div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
						<HistoryIcon className="size-5 text-primary" />
					</div>
					<div>
						<CardTitle>{t("credits.history.title")}</CardTitle>
						<CardDescription>{t("credits.subtitle")}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="relative space-y-4">
				<CreditHistoryFilters
					typeFilter={typeFilter}
					startDate={startDate}
					endDate={endDate}
					resultsCount={filteredTransactions.length}
					onTypeChange={setTypeFilter}
					onStartDateChange={setStartDate}
					onEndDateChange={setEndDate}
					onReset={() => {
						setTypeFilter("ALL");
						setStartDate("");
						setEndDate("");
					}}
					isFiltering={isFiltering}
				/>
				{isInitialLoading ? (
					<CreditHistoryLoading />
				) : !hasTransactions ? (
					<div className="py-8 text-center text-muted-foreground">
						{isFiltering
							? t("credits.history.filteredEmpty")
							: t("credits.history.empty")}
					</div>
				) : (
					<div className="space-y-4">
						<div className="relative space-y-3 pl-6">
							<div className="absolute left-2 top-0 h-full w-px bg-border/70" />
					{displayTransactions.map((transaction) => (
								<CreditTransactionRow
									key={transaction.id}
									transaction={transaction}
									label={t(
										`credits.history.types.${transaction.type}`,
									)}
									balanceLabel={t("credits.balance.title")}
								/>
							))}
						</div>
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

function CreditHistoryFilters({
	typeFilter,
	startDate,
	endDate,
	resultsCount,
	onTypeChange,
	onStartDateChange,
	onEndDateChange,
	onReset,
	isFiltering,
}: CreditHistoryFiltersProps) {
	const t = useTranslations();

	return (
		<div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
					<div className="grid gap-2">
						<span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							{t("credits.history.filters.type")}
						</span>
						<Select
							value={typeFilter}
							onValueChange={(value) =>
								onTypeChange(value as TransactionFilterType)
							}
						>
							<SelectTrigger className="h-11 rounded-xl">
								<SelectValue
									placeholder={t("credits.history.filters.allTypes")}
								/>
							</SelectTrigger>
							<SelectContent>
								{transactionFilterTypes.map((filterType) => (
									<SelectItem key={filterType} value={filterType}>
										{filterType === "ALL"
											? t("credits.history.filters.allTypes")
											: t(
													`credits.history.types.${filterType}`,
												)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2">
						<span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							{t("credits.history.filters.from")}
						</span>
						<Input
							type="date"
							value={startDate}
							onChange={(event) => onStartDateChange(event.target.value)}
							className="h-11 rounded-xl"
						/>
					</div>
					<div className="grid gap-2">
						<span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							{t("credits.history.filters.to")}
						</span>
						<Input
							type="date"
							value={endDate}
							onChange={(event) => onEndDateChange(event.target.value)}
							className="h-11 rounded-xl"
						/>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					{isFiltering && (
						<Button variant="ghost" size="sm" onClick={onReset}>
							{t("credits.history.filters.clear")}
						</Button>
					)}
					<span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
						{t("credits.history.filters.results", {
							count: resultsCount,
						})}
					</span>
				</div>
			</div>
		</div>
	);
}

function CreditTransactionRow({
	transaction,
	label,
	balanceLabel,
}: CreditTransactionRowProps) {
	const meta = getTransactionMeta(transaction.type);
	const isPositive =
		transaction.type === "TOPUP" || transaction.type === "REFUND";
	const amount = formatCredits(Math.abs(transaction.amount));

	return (
		<div className="relative rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
			<div
				className={cn(
					"absolute -left-3 top-6 flex size-6 items-center justify-center rounded-full border bg-background text-primary shadow-sm",
					meta.dotClass,
				)}
			>
				<meta.Icon className="size-3.5" />
			</div>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<Badge status={meta.badgeStatus}>{label}</Badge>
						{transaction.reason && (
							<span className="text-xs text-muted-foreground">
								{transaction.reason}
							</span>
						)}
					</div>
					<div className="text-xs text-muted-foreground">
						{formatDateTime(new Date(transaction.createdAt))}
					</div>
				</div>
				<div className="text-left sm:text-right">
					<div
						className={cn(
							"text-lg font-semibold tabular-nums",
							meta.amountClass,
						)}
					>
						{isPositive ? "+" : "-"}
						{amount}
					</div>
					<div className="text-xs text-muted-foreground">
						<span className="uppercase tracking-[0.18em]">
							{balanceLabel}
						</span>{" "}
						{formatCredits(transaction.balanceAfter)}
					</div>
				</div>
			</div>
		</div>
	);
}

function CreditHistoryLoading() {
	return (
		<div className="space-y-3">
			{creditHistoryLoadingRows.map((row) => (
				<Skeleton key={row} className="h-20 w-full rounded-2xl" />
			))}
		</div>
	);
}

function formatDateTime(value: Date) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(value);
}

function formatCredits(amount: number) {
	return new Intl.NumberFormat(undefined).format(amount);
}

function getTransactionMeta(type: CreditTransactionType) {
	return transactionMeta[type];
}

function getDateRange(startDate: string, endDate: string) {
	const start = startDate ? new Date(startDate) : null;
	const end = endDate ? new Date(endDate) : null;

	if (start && Number.isNaN(start.getTime())) {
		return { start: null, end };
	}

	if (end && Number.isNaN(end.getTime())) {
		return { start, end: null };
	}

	if (start) start.setHours(0, 0, 0, 0);
	if (end) end.setHours(23, 59, 59, 999);

	return { start, end };
}

const creditHistoryLoadingRows = [0, 1, 2, 3];
const transactionFilterTypes: TransactionFilterType[] = [
	"ALL",
	"TOPUP",
	"CONSUMPTION",
	"REFUND",
	"ADJUSTMENT",
];

const transactionMeta: Record<CreditTransactionType, TransactionMeta> = {
	TOPUP: {
		Icon: ArrowUpIcon,
		amountClass: "text-emerald-500",
		badgeStatus: "success",
		dotClass: "border-emerald-500/40 text-emerald-500",
	},
	CONSUMPTION: {
		Icon: ArrowDownIcon,
		amountClass: "text-rose-500",
		badgeStatus: "error",
		dotClass: "border-rose-500/40 text-rose-500",
	},
	REFUND: {
		Icon: RefreshCwIcon,
		amountClass: "text-sky-500",
		badgeStatus: "info",
		dotClass: "border-sky-500/40 text-sky-500",
	},
	ADJUSTMENT: {
		Icon: SettingsIcon,
		amountClass: "text-amber-500",
		badgeStatus: "warning",
		dotClass: "border-amber-500/40 text-amber-500",
	},
};

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

interface CreditHistoryFiltersProps {
	typeFilter: TransactionFilterType;
	startDate: string;
	endDate: string;
	resultsCount: number;
	onTypeChange: (value: TransactionFilterType) => void;
	onStartDateChange: (value: string) => void;
	onEndDateChange: (value: string) => void;
	onReset: () => void;
	isFiltering: boolean;
}

interface CreditTransactionRowProps {
	transaction: CreditTransaction;
	label: string;
	balanceLabel: string;
}

interface TransactionMeta {
	Icon: typeof ArrowUpIcon;
	amountClass: string;
	badgeStatus: "success" | "info" | "warning" | "error";
	dotClass: string;
}

type TransactionFilterType = CreditTransactionType | "ALL";
