import { config } from "@repo/config";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type ProductReferenceId = keyof (typeof config)["payments"]["plans"];

export function usePlanData() {
	const t = useTranslations();

	const planData: Record<
		ProductReferenceId,
		{
			title: string;
			description: ReactNode;
			features: ReactNode[];
		}
	> = {
		free: {
			title: t("pricing.products.free.title"),
			description: t("pricing.products.free.description"),
			features: [
				t("pricing.products.free.features.freeCredits", {
					count: config.payments.plans.free.credits ?? 0,
				}),
				t("pricing.products.free.features.myPhotosRetention1Days"),
				t("pricing.products.free.features.topUpAnytime"),
			],
		},
		plus: {
			title: t("pricing.products.plus.title"),
			description: t("pricing.products.plus.description"),
			features: [
				t("pricing.products.plus.features.creditsPerYear", {
					count: config.payments.plans.plus.credits ?? 0,
				}),
				t("pricing.products.plus.features.myPhotosRetention7Days"),
				t("pricing.products.plus.features.standardQueue"),
				t("pricing.products.plus.features.topUpAnytime"),
			],
		},
		pro: {
			title: t("pricing.products.pro.title"),
			description: t("pricing.products.pro.description"),
			features: [
				t("pricing.products.pro.features.creditsPerYear", {
					count: config.payments.plans.pro.credits ?? 0,
				}),
				t(
					"pricing.products.pro.features.myPhotosRetentionSubscription",
				),
				t("pricing.products.pro.features.priorityQueue"),
				t("pricing.products.pro.features.topUpAnytime"),
			],
		},
	};

	return { planData };
}
