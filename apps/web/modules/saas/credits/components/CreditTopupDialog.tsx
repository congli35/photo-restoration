"use client";

import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { cn } from "@ui/lib";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export function CreditTopupDialog({
	open,
	onOpenChange,
}: CreditTopupDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [amount, setAmount] = useState<number>(10);

	const topupMutation = useMutation(orpc.credits.topup.mutationOptions());

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			await topupMutation.mutateAsync({ amount });
			toast.success(t("credits.topup.notifications.success", { amount }));
			queryClient.invalidateQueries({ queryKey: ["credits"] });
			onOpenChange(false);
			setAmount(10);
		} catch {
			toast.error(t("credits.topup.notifications.error"));
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="relative overflow-hidden border-border/70 bg-[linear-gradient(160deg,rgba(78,109,245,0.08)_0%,rgba(255,255,255,0)_60%)]">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_circle_at_-10%_-20%,rgba(78,109,245,0.18),transparent_60%)]" />
				<DialogHeader className="relative">
					<DialogTitle className="text-2xl">
						{t("credits.topup.title")}
					</DialogTitle>
					<DialogDescription>
						{t("credits.topup.description")}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="relative">
					<div className="grid gap-5 py-4">
						<div className="grid gap-2">
							<Label htmlFor="amount">
								{t("credits.topup.amount")}
							</Label>
							<div className="relative">
								<Input
									id="amount"
									type="number"
									min={1}
									value={amount}
									onChange={(e) => {
										const nextValue = Number.parseInt(
											e.target.value,
											10,
										);
										setAmount(Number.isNaN(nextValue) ? 0 : nextValue);
									}}
									className="h-12 pr-16 text-lg font-semibold"
								/>
								<div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
									Credits
								</div>
							</div>
						</div>
						<div className="grid gap-2">
							<div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
								{t("credits.topup.amount")}
							</div>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
								{presetAmounts.map((preset) => (
									<Button
										key={preset}
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setAmount(preset)}
										className={cn(
											"h-10 rounded-xl text-sm font-semibold",
											amount === preset &&
												"border-primary/40 bg-primary/10 text-primary",
										)}
									>
										{preset}
									</Button>
								))}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							loading={topupMutation.isPending}
							disabled={amount <= 0}
						>
							{t("credits.topup.submit")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

const presetAmounts = [10, 25, 50, 100];

interface CreditTopupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}
