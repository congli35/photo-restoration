"use client";

import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import { CoinsIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function CreditBalance({
	balance,
	updatedAt,
	onTopup,
}: CreditBalanceProps) {
	const t = useTranslations();

	return (
		<Card className="relative overflow-hidden border-border/70 bg-[linear-gradient(135deg,rgba(78,109,245,0.12)_0%,rgba(255,255,255,0)_55%)]">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_0%_-20%,rgba(78,109,245,0.2),transparent_60%)]" />
			<CoinsIcon
				className="pointer-events-none absolute -right-6 -top-6 size-32 text-primary/10"
				aria-hidden
			/>
			<CardHeader className="relative space-y-6 pb-4">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
							<CoinsIcon className="size-5 text-primary" />
						</div>
						<div>
							<CardTitle className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
								{t("credits.balance.title")}
							</CardTitle>
							{updatedAt && (
								<p className="mt-1 text-xs text-muted-foreground">
									{t("credits.balance.lastUpdated", {
										date: new Date(updatedAt).toLocaleDateString(),
									})}
								</p>
							)}
						</div>
					</div>
					<Button onClick={onTopup} size="lg" className="gap-2">
						<PlusIcon className="size-4" />
						{t("credits.topup.submit")}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="relative">
				<div className="flex flex-col gap-3">
					<div className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
						{t("credits.balance.credits", { count: balance })}
					</div>
					<p className="text-sm text-muted-foreground">
						{t("credits.subtitle")}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

interface CreditBalanceProps {
	balance: number;
	updatedAt: string | null;
	onTopup: () => void;
}
