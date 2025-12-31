import { FaqSection } from "@marketing/home/components/FaqSection";
import { Hero } from "@marketing/home/components/Hero";
import { PricingSection } from "@marketing/home/components/PricingSection";
import { setRequestLocale } from "next-intl/server";

export default async function Home({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);

	return (
		<>
			<Hero />
			<PricingSection />
			<FaqSection />
		</>
	);
}
