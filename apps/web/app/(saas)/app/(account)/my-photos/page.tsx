import { db } from "@repo/database";
import { getSignedUrl } from "@repo/storage";
import { getSession } from "@saas/auth/lib/server";
import { MyPhotosGallery } from "@saas/photos/components/MyPhotosGallery";
import type { PhotoCardData } from "@saas/photos/types";
import { formatDate, getGalleryTitle } from "@saas/photos/utils";
import { UserAvatar } from "@shared/components/UserAvatar";
import { Button } from "@ui/components/button";
import {
	CalendarDays,
	Image as ImageIcon,
	Sparkles,
	UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MyPhotosPage() {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	const bucketName = process.env.NEXT_PUBLIC_PHOTO_RESTORATION_BUCKET_NAME;
	const photos = await getUserPhotos(session.user.id, bucketName);
	const totalRestorations = photos.reduce(
		(count, photo) => count + photo.restorations.length,
		0,
	);
	const latestUpload = photos[0]?.createdAt ?? null;
	const galleryTitle = getGalleryTitle(session.user.name ?? "");

	return (
		<div className="flex flex-col gap-8">
			<section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-6">
						<div className="relative">
							<UserAvatar
								name={session.user.name ?? ""}
								avatarUrl={session.user.image}
								className="size-24 rounded-full ring-4 ring-background"
							/>
						</div>
						<div>
							<h1 className="text-2xl font-semibold text-foreground">
								{galleryTitle}
							</h1>
							<div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
								<span className="flex items-center gap-1">
									<ImageIcon className="size-4 text-primary" />
									{photos.length} Photo
									{photos.length === 1 ? "" : "s"}
								</span>
								<span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
								<span className="flex items-center gap-1">
									<Sparkles className="size-4 text-primary" />
									{totalRestorations} Restoration
									{totalRestorations === 1 ? "" : "s"}
								</span>
								<span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
								<span className="flex items-center gap-1">
									<CalendarDays className="size-4 text-primary" />
									{latestUpload
										? `Latest upload ${formatDate(latestUpload)}`
										: "No uploads yet"}
								</span>
							</div>
						</div>
					</div>
					<div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
						<Button asChild className="gap-2">
							<Link href="/app">
								<UploadCloud className="size-4" />
								Upload New
							</Link>
						</Button>
					</div>
				</div>
			</section>

			<MyPhotosGallery photos={photos} />
		</div>
	);
}

async function getUserPhotos(userId: string, bucketName?: string) {
	const images = await db.image.findMany({
		where: {
			userId,
		},
		orderBy: {
			createdAt: "desc",
		},
		include: {
			restorations: {
				orderBy: {
					createdAt: "desc",
				},
			},
		},
	});

	const photos = await Promise.all(
		images.map(async (image) => {
			const originalUrl = await getSignedImageUrl(
				image.originalUrl,
				bucketName,
			);
			const restorations = await Promise.all(
				image.restorations.map(async (restoration) => ({
					id: restoration.id,
					status: restoration.status,
					createdAt: restoration.createdAt.toISOString(),
					url: await getSignedImageUrl(
						restoration.fileUrl,
						bucketName,
					),
				})),
			);

			return {
				id: image.id,
				createdAt: image.createdAt.toISOString(),
				originalUrl,
				restorations,
			};
		}),
	);

	return photos satisfies PhotoCardData[];
}

async function getSignedImageUrl(path: string | null, bucketName?: string) {
	if (!path || !bucketName) {
		return null;
	}

	return getSignedUrl(path, {
		bucket: bucketName,
		expiresIn: 60 * 10,
	});
}
