import { getSession } from "@saas/auth/lib/server";
import { MyCreditsView } from "@saas/credits/components/MyCreditsView";
import { Skeleton } from "@ui/components/skeleton";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function MyCreditsPage() {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	const t = await getTranslations();

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold text-foreground">
					{t("credits.title")}
				</h1>
				<p className="text-sm text-muted-foreground">
					{t("credits.subtitle")}
				</p>
			</div>

			<Suspense fallback={<CreditsLoadingState />}>
				<MyCreditsView />
			</Suspense>
		</div>
	);
}

function CreditsLoadingState() {
	return (
		<div className="flex flex-col gap-6">
			<Skeleton className="h-44 w-full rounded-3xl" />
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-9 w-28 rounded-full" />
				</div>
				<div className="space-y-3">
					{creditsLoadingRows.map((row) => (
						<Skeleton key={row} className="h-20 w-full rounded-2xl" />
					))}
				</div>
			</div>
		</div>
	);
}

const creditsLoadingRows = [0, 1, 2];
