"use client";

import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import { CoinsIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface CreditBalanceProps {
	balance: number;
	updatedAt: string | null;
	onTopup: () => void;
}

export function CreditBalance({
	balance,
	updatedAt,
	onTopup,
}: CreditBalanceProps) {
	const t = useTranslations();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CoinsIcon className="size-5 text-primary" />
					{t("credits.balance.title")}
				</CardTitle>
				{updatedAt && (
					<CardDescription>
						{t("credits.balance.lastUpdated", {
							date: new Date(updatedAt).toLocaleDateString(),
						})}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between">
					<div className="text-4xl font-bold text-primary">
						{t("credits.balance.credits", { count: balance })}
					</div>
					<Button onClick={onTopup} className="gap-2">
						<PlusIcon className="size-4" />
						{t("credits.topup.submit")}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
