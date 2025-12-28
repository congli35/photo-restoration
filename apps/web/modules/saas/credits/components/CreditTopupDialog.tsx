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
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface CreditTopupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

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

	const presetAmounts = [10, 25, 50, 100];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("credits.topup.title")}</DialogTitle>
					<DialogDescription>
						{t("credits.topup.description")}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="amount">
								{t("credits.topup.amount")}
							</Label>
							<Input
								id="amount"
								type="number"
								min={1}
								value={amount}
								onChange={(e) =>
									setAmount(Number.parseInt(e.target.value) || 0)
								}
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							{presetAmounts.map((preset) => (
								<Button
									key={preset}
									type="button"
									variant={amount === preset ? "primary" : "outline"}
									size="sm"
									onClick={() => setAmount(preset)}
								>
									{preset}
								</Button>
							))}
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
