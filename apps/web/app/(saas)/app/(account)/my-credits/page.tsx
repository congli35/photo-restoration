import { getSession } from "@saas/auth/lib/server";
import { MyCreditsView } from "@saas/credits/components/MyCreditsView";
import { CoinsIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function MyCreditsPage() {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	const t = await getTranslations();

	return (
		<div className="flex flex-col gap-8">
			<section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
				<div className="flex items-center gap-4">
					<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
						<CoinsIcon className="size-6 text-primary" />
					</div>
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							{t("credits.title")}
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{t("credits.subtitle")}
						</p>
					</div>
				</div>
			</section>

			<MyCreditsView />
		</div>
	);
}
