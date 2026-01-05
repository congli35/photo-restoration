"use client";
import { type Config, config } from "@repo/config";
import { PricingTable } from "@saas/payments/components/PricingTable";
import { useLocaleCurrency } from "@shared/hooks/locale-currency";
import { useFormatter, useTranslations } from "next-intl";

export function PricingSection() {
	const t = useTranslations();
	const format = useFormatter();
	const localeCurrency = useLocaleCurrency();
	const creditPrice = getCreditPriceByCurrency(
		config.payments.credits.prices,
		localeCurrency,
	);

	return (
		<section id="pricing" className="scroll-mt-16 py-12 lg:py-16">
			<div className="container max-w-5xl">
				<div className="mb-6 lg:text-center">
					<h1 className="font-bold text-4xl lg:text-5xl">
						{t("pricing.title")}
					</h1>
					<p className="mt-3 text-lg opacity-50">
						{t("pricing.description")}
					</p>
				</div>

					<PricingTable />

					{creditPrice && (
						<div className="mt-6 rounded-2xl border bg-muted/30 p-4 lg:mx-auto lg:max-w-xl">
							<div className="flex items-baseline justify-between gap-4">
								<div className="font-medium text-sm">
									{t("pricing.creditPacks.title")}
								</div>
								<div className="font-semibold text-primary text-sm">
									{t("pricing.creditPacks.price", {
										price: format.number(
											creditPrice.amount,
											{
												style: "currency",
												currency: creditPrice.currency,
											},
										),
									})}
								</div>
							</div>
							<p className="mt-1 text-foreground/60 text-xs">
								{t("pricing.creditPacks.subtitle")}
							</p>
						</div>
					)}
				</div>
			</section>
		);
	}

type CreditPrice = Config["payments"]["credits"]["prices"][number];

function isPriceVisible(price: CreditPrice) {
	return !("hidden" in price) || !price.hidden;
}

function getCreditPriceByCurrency(
	prices: CreditPrice[],
	currency: string,
): CreditPrice | undefined {
	return (
		prices.find(
			(price) => isPriceVisible(price) && price.currency === currency,
		) ??
		prices.find(
			(price) =>
				isPriceVisible(price) &&
				price.currency === config.i18n.defaultCurrency,
		) ??
		prices.find((price) => isPriceVisible(price))
	);
}
