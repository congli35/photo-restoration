import { type Config, config } from "@repo/config";

const plans = config.payments.plans as Config["payments"]["plans"];

export interface PlanCreditsMatch {
	planId: string;
	credits: number;
}

export function getPlanCreditsByProductId(
	productId: string,
): PlanCreditsMatch | null {
	const entry = Object.entries(plans).find(([_, plan]) =>
		plan.prices?.some((price) => price.productId === productId),
	);

	if (!entry) {
		return null;
	}

	const [planId, plan] = entry;

	return {
		planId,
		credits: typeof plan.credits === "number" ? plan.credits : 0,
	};
}
