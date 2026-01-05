import { cn } from "@ui/lib";
import { useTranslations } from "next-intl";

export function FaqSection({ className }: { className?: string }) {
	const t = useTranslations();

	const items = [
		{
			question: "What is photo restoration?",
			answer: "Photo restoration repairs scratches, fading, and color loss to bring old photos back to life.",
		},
		{
			question: "Can photo restoration fix scratches and damage?",
			answer: "Yes. Our photo restoration removes scratches, dust, and minor damage while preserving textures.",
		},
		{
			question: "Do I get multiple results to choose from?",
			answer: "Yes. Every photo restoration generates three versions so you can compare results and choose the best one.",
		},
		{
			question: "How long does photo restoration take?",
			answer: "Most photo restoration jobs finish in seconds, but timing depends on your subscription plan priority and current server load.",
		},
		{
			question: "Does photo restoration work on black-and-white photos?",
			answer: "Absolutely. Photo restoration cleans damage on black-and-white photos and can restore color if you want it.",
		},
		{
			question: "What is the photo retention policy?",
			answer: "We keep your photo restoration history so you can revisit results in My Photos, and you can delete any item there at any time.",
		},
		{
			question: "What input formats are supported for photo restoration?",
			answer: "Photo restoration supports common image formats like JPG and PNG, and the default restored output format is PNG.",
		},
		{
			question: "What resolutions are supported for photo restoration?",
			answer: "Photo restoration results are available in 1K, 2K, and 4K resolutions, depending on your plan and source image quality.",
		},
	];

	if (!items) {
		return null;
	}

	return (
		<section
			className={cn("scroll-mt-20 border-t py-12 lg:py-16", className)}
			id="faq"
		>
			<div className="container max-w-5xl">
				<div className="mb-12 lg:text-center">
					<h1 className="mb-2 font-bold text-4xl lg:text-5xl">
						{t("faq.title")}
					</h1>
					<p className="text-lg opacity-50">{t("faq.description")}</p>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{items.map((item, i) => (
						<div
							key={`faq-item-${i}`}
							className="rounded-lg bg-card border p-4 lg:p-6"
						>
							<h4 className="mb-2 font-semibold text-lg">
								{item.question}
							</h4>
							<p className="text-foreground/60">{item.answer}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
