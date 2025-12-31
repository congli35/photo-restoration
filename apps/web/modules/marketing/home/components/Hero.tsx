import { LocaleLink } from "@i18n/routing";
import { ImageCompareSlider } from "@shared/components/ImageCompareSlider";
import { Button } from "@ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import beforeImage from "../../../../public/images/before.png";
import afterImage from "../../../../public/images/after.png";

export function Hero() {
	return (
		<div className="relative max-w-full overflow-hidden bg-[radial-gradient(120%_80%_at_50%_-10%,hsl(var(--primary)/0.22),transparent_60%)]">
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,hsl(var(--background)/0.65)_48%,hsl(var(--background))_100%)]" />
			<div className="absolute left-1/2 top-12 z-10 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-primary/25 blur-[160px]" />
			<div className="absolute right-[-120px] top-24 z-10 h-[360px] w-[360px] rounded-full bg-foreground/10 blur-[140px]" />
			<div className="container relative z-20 pt-28 pb-12 lg:pt-36 lg:pb-16">
				<div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
					<div className="text-center lg:text-left">
						<div className="mb-4 flex justify-center lg:justify-start">
							<div className="mx-auto flex flex-wrap items-center justify-center rounded-full border border-highlight/30 p-px px-4 py-1 font-normal text-highlight text-sm lg:mx-0">
								<span className="flex items-center gap-2 rounded-full font-semibold text-highlight">
									<span className="size-2 rounded-full bg-highlight" />
									New:
								</span>
								<span className="ml-1 block font-medium text-foreground">
									Texture-aware scratch repair
								</span>
							</div>
						</div>

						<h1 className="mx-auto max-w-3xl text-balance font-bold text-5xl lg:mx-0 lg:max-w-xl lg:text-6xl xl:text-7xl">
							Restore faded photos to gallery-ready clarity.
						</h1>

						<p className="mx-auto mt-4 max-w-2xl text-balance text-foreground/60 text-lg lg:mx-0 lg:max-w-xl">
							Repair scratches, revive color, and sharpen faces in
							seconds. Slide to compare the original against the
							restored image.
						</p>

						<div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-foreground/50 lg:justify-start">
							{restorationHighlights.map((highlight) => (
								<span
									key={highlight}
									className="rounded-full border border-foreground/10 bg-card/60 px-4 py-1 font-semibold text-[11px] text-foreground/70"
								>
									{highlight}
								</span>
							))}
						</div>

						<div className="mt-6 flex flex-col items-center justify-center gap-3 md:flex-row lg:justify-start lg:items-start">
							<Button size="lg" variant="primary" asChild>
								<Link href="/auth/login">
									Restore a photo
									<ArrowRightIcon className="ml-2 size-4" />
								</Link>
							</Button>
							<Button variant="light" size="lg" asChild>
								<LocaleLink href="/docs">
									See restoration guide
								</LocaleLink>
							</Button>
						</div>

						<p className="mt-4 text-balance text-foreground/50 text-sm lg:max-w-md">
							Private by default. Export in 4K. Keep every
							original.
						</p>
					</div>

					<div className="text-center">
						<ImageCompareSlider
							className="rounded-3xl border border-foreground/10 bg-gradient-to-br from-card/80 via-background/80 to-card/60 p-3 shadow-[0_30px_80px_-40px_hsl(var(--primary)/0.45)]"
							frameClassName="relative aspect-[4/3] overflow-hidden rounded-2xl border border-foreground/10 bg-muted/30"
							beforeImage={{
								src: beforeImage.src,
								alt: "Original damaged photo",
								className: "h-full",
							}}
							afterImage={{
								src: afterImage.src,
								alt: "Restored photo",
								className: "h-full",
							}}
							overlay={
								<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.25),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.18),transparent_45%)]" />
							}
							beforeLabel={
								<span className="rounded-full border border-white/50 bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
									Before
								</span>
							}
							afterLabel={
								<span className="rounded-full border border-white/50 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
									After
								</span>
							}
							handleClassName="border-white/70 bg-black/40 text-white"
						/>
						<div className="mt-4 flex items-center justify-between text-foreground/50 text-xs">
							<span>Drag to reveal</span>
							<span>Original / Restored</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

const restorationHighlights = [
	"Scratch repair",
	"Color revival",
	"Face clarity",
	"4K export",
];
