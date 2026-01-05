import { FaqSection } from "@marketing/home/components/FaqSection";
import { Hero } from "@marketing/home/components/Hero";
import { PricingSection } from "@marketing/home/components/PricingSection";
import { getBaseUrl } from "@repo/utils";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

export async function generateMetadata(props: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await props.params;
	const baseUrl = getBaseUrl();
	const title = "Photo restoration that revives every detail";
	const description =
		"Photo restoration for scratches, fading, and color loss. Restore old photos online in seconds with gallery-ready results.";

	return {
		title,
		description,
		keywords: [
			"photo restoration",
			"restore old photos",
			"photo repair",
			"scratch removal",
			"color restoration",
			"AI photo restoration",
			"restore photos online",
		],
		alternates: {
			canonical: `/${locale}`,
		},
		openGraph: {
			title,
			description,
			type: "website",
			url: new URL(`/${locale}`, baseUrl).toString(),
			images: [new URL("/images/og.png", baseUrl).toString()],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [new URL("/images/og.png", baseUrl).toString()],
		},
	};
}

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
