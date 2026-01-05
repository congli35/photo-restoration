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
			question: "How long does photo restoration take?",
			answer: "Most photo restoration jobs finish in seconds, depending on file size and detail.",
		},
		{
			question: "Does photo restoration work on black-and-white photos?",
			answer: "Absolutely. Photo restoration cleans damage on black-and-white photos and can restore color if you want it.",
		},
		{
			question: "Is my photo safe during photo restoration?",
			answer: "Your originals stay private, and you can download both the original and the restored photo.",
		},
		{
			question: "What files are best for photo restoration?",
			answer: "High-resolution scans in common formats like JPG or PNG produce the sharpest photo restoration results.",
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
