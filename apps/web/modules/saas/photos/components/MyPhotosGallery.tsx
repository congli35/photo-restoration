"use client";

import type { PhotoCardData, RestorationData } from "@saas/photos/types";
import { formatDate, formatVersionLabel } from "@saas/photos/utils";
import { useConfirmationAlert } from "@saas/shared/components/ConfirmationAlertProvider";
import { useRouter } from "@shared/hooks/router";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@ui/components/dialog";
import { cn } from "@ui/lib";
import {
	ChevronLeft,
	ChevronRight,
	Download,
	Eye,
	Image as ImageIcon,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function MyPhotosGallery({ photos }: MyPhotosGalleryProps) {
	const router = useRouter();
	const { confirm } = useConfirmationAlert();
	const [selectedPhotoSet, setSelectedPhotoSet] =
		useState<SelectedPhotoSet | null>(null);
	const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

	const deleteImageMutation = useMutation(
		orpc.ai.images.delete.mutationOptions(),
	);

	const selectedPhoto = selectedPhotoSet
		? selectedPhotoSet.photos[selectedPhotoSet.index]
		: null;

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setSelectedPhotoSet(null);
		}
	};

	const handleOpenPhoto = (
		photoId: string,
		photoSet: SelectedPhoto[],
		index: number,
	) => {
		if (photoSet.length === 0) {
			return;
		}

		setSelectedPhotoSet({
			photoId,
			photos: photoSet,
			index,
		});
	};

	const handleSelectIndex = (index: number) => {
		setSelectedPhotoSet((currentSet) => {
			if (!currentSet) {
				return currentSet;
			}

			return {
				photoId: currentSet.photoId,
				photos: currentSet.photos,
				index,
			};
		});
	};

	const handlePrevious = () => {
		setSelectedPhotoSet((currentSet) => {
			if (!currentSet || currentSet.index <= 0) {
				return currentSet;
			}

			return {
				photoId: currentSet.photoId,
				photos: currentSet.photos,
				index: currentSet.index - 1,
			};
		});
	};

	const handleNext = () => {
		setSelectedPhotoSet((currentSet) => {
			if (
				!currentSet ||
				currentSet.index >= currentSet.photos.length - 1
			) {
				return currentSet;
			}

			return {
				photoId: currentSet.photoId,
				photos: currentSet.photos,
				index: currentSet.index + 1,
			};
		});
	};

	const handleDownload = async () => {
		if (!selectedPhoto?.url) {
			return;
		}

		try {
			const response = await fetch(selectedPhoto.url);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${selectedPhoto.title.replace(/\s+/g, "-")}.jpg`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Failed to download image:", error);
		}
	};

	const handleDelete = (photoId: string) => {
		if (deleteImageMutation.isPending && deletingPhotoId === photoId) {
			return;
		}

		confirm({
			title: "Delete this photo?",
			message:
				"This will permanently remove the original and all restorations.",
			confirmLabel: "Delete photo",
			destructive: true,
			onConfirm: async () => {
				if (deleteImageMutation.isPending) {
					return;
				}

				setDeletingPhotoId(photoId);
				try {
					await deleteImageMutation.mutateAsync({ id: photoId });
					toast.success("Photo deleted.");
					setSelectedPhotoSet(null);
					router.refresh();
				} catch {
					toast.error("Failed to delete photo.");
				} finally {
					setDeletingPhotoId(null);
				}
			},
		});
	};

	const isDeletingSelectedPhoto =
		deleteImageMutation.isPending &&
		deletingPhotoId === selectedPhotoSet?.photoId;

	return (
		<section className="flex flex-col gap-6">
			{photos.length === 0 ? (
				<EmptyState />
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
					{photos.map((photo, index) => (
						<PhotoCard
							key={photo.id}
							photo={photo}
							photoNumber={index + 1}
							onOpen={handleOpenPhoto}
							onDelete={handleDelete}
							isDeleting={deleteImageMutation.isPending}
							deletingPhotoId={deletingPhotoId}
						/>
					))}
				</div>
			)}

			<Dialog
				open={Boolean(selectedPhotoSet)}
				onOpenChange={handleOpenChange}
			>
				<DialogContent
					className={cn(
						"max-w-5xl overflow-hidden border-border/60 bg-background/95 p-0 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.7)]",
						"before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-[radial-gradient(140%_90%_at_10%_10%,rgba(255,255,255,0.16),transparent_60%)]",
					)}
				>
					<div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
						<div className="flex flex-col gap-4">
							<div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/30 p-3">
								{selectedPhoto?.url ? (
									<img
										src={selectedPhoto.url}
										alt={selectedPhoto.title}
										className="max-h-[70vh] w-full rounded-xl bg-black/5 object-contain"
										loading="eager"
									/>
								) : null}
								{selectedPhotoSet &&
								selectedPhotoSet.photos.length > 1 ? (
									<>
										<button
											className={cn(
												"absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-2.5 text-white backdrop-blur-sm transition",
												"hover:bg-black/80 disabled:opacity-30",
											)}
											type="button"
											onClick={handlePrevious}
											disabled={selectedPhotoSet.index === 0}
										>
											<ChevronLeft className="size-5" />
										</button>
										<button
											className={cn(
												"absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-2.5 text-white backdrop-blur-sm transition",
												"hover:bg-black/80 disabled:opacity-30",
											)}
											type="button"
											onClick={handleNext}
											disabled={
												selectedPhotoSet.index ===
												selectedPhotoSet.photos.length - 1
											}
										>
											<ChevronRight className="size-5" />
										</button>
									</>
								) : null}
							</div>
							{selectedPhotoSet &&
							selectedPhotoSet.photos.length > 1 ? (
								<div className="flex items-center gap-2 overflow-x-auto pb-2">
									{selectedPhotoSet.photos.map((photo, index) => (
										<button
											key={`${photo.url}-${index}`}
											className={cn(
												"relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/20 transition",
												"hover:border-primary/60",
												index === selectedPhotoSet.index
													? "ring-2 ring-primary/70"
													: "ring-0",
											)}
											type="button"
											onClick={() => handleSelectIndex(index)}
										>
											<img
												src={photo.url}
												alt={photo.title}
												className="h-full w-full object-cover"
												loading="lazy"
											/>
										</button>
									))}
								</div>
							) : null}
						</div>
						<div className="flex flex-col gap-5">
							<div className="space-y-2">
								<p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-muted-foreground">
									Archive Detail
								</p>
								<DialogTitle className="text-2xl font-semibold text-foreground sm:text-3xl">
									{selectedPhoto?.title}
								</DialogTitle>
								{selectedPhoto?.subtitle ? (
									<p className="text-sm text-muted-foreground">
										{selectedPhoto.subtitle}
									</p>
								) : null}
							</div>
							<div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<span className="uppercase tracking-[0.3em]">
										Frame
									</span>
									{selectedPhotoSet ? (
										<span className="font-semibold text-foreground">
											{selectedPhotoSet.index + 1} /{" "}
											{selectedPhotoSet.photos.length}
										</span>
									) : null}
								</div>
								<div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border/70">
									<div
										className="h-full bg-primary"
										style={{
											width: selectedPhotoSet
												? `${((selectedPhotoSet.index + 1) / selectedPhotoSet.photos.length) * 100}%`
												: "0%",
										}}
									/>
								</div>
							</div>
							<Button
								className="w-full gap-2"
								variant="primary"
								type="button"
								onClick={handleDownload}
							>
								<Download className="size-4" />
								Download
							</Button>
							{selectedPhotoSet ? (
								<Button
									className="w-full gap-2"
									variant="error"
									type="button"
									loading={isDeletingSelectedPhoto}
									disabled={isDeletingSelectedPhoto}
									onClick={() =>
										handleDelete(selectedPhotoSet.photoId)
									}
								>
									<Trash2 className="size-4" />
									Delete photo
								</Button>
							) : null}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</section>
	);
}

function PhotoCard({
	photo,
	photoNumber,
	onOpen,
	onDelete,
	isDeleting,
	deletingPhotoId,
}: {
	photo: PhotoCardData;
	photoNumber: number;
	onOpen: (photoId: string, photoSet: SelectedPhoto[], index: number) => void;
	onDelete: (photoId: string) => void;
	isDeleting: boolean;
	deletingPhotoId: string | null;
}) {
	const completedRestorations = photo.restorations.filter(
		(restoration) => restoration.status === "COMPLETED" && restoration.url,
	);
	const pendingRestorations = photo.restorations.filter(
		(restoration) => restoration.status !== "COMPLETED",
	);
	const versionLabel = formatVersionLabel(photo.restorations.length);
	const selectedPhotos = buildSelectedPhotos(photo);
	const photoIndexByUrl = new Map(
		selectedPhotos.map((selectedPhoto, index) => [
			selectedPhoto.url,
			index,
		]),
	);
	const hasOriginal = Boolean(photo.originalUrl);
	const hasRestorations =
		completedRestorations.length > 0 || pendingRestorations.length > 0;

	return (
		<article
			className={cn(
				"group relative flex flex-col overflow-hidden rounded-[28px] border border-border/60 bg-card/80 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.5)] transition",
				"hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_30px_70px_-36px_rgba(15,23,42,0.6)]",
				"before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-[radial-gradient(120%_90%_at_20%_0%,rgba(255,255,255,0.18),transparent_60%)]",
			)}
		>
			<div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 blur-3xl" />
			<Button
				className={cn(
					"absolute right-4 top-4 z-20 rounded-full border border-white/10 opacity-100 shadow-sm transition md:opacity-0 md:group-hover:opacity-100",
				)}
				variant="error"
				size="icon"
				type="button"
				loading={isDeleting && deletingPhotoId === photo.id}
				disabled={isDeleting && deletingPhotoId === photo.id}
				onClick={() => onDelete(photo.id)}
				aria-label="Delete photo"
			>
				<Trash2 className="size-4" />
			</Button>
			<div className="relative">
				<div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/30">
					<div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.6),transparent_55%)] opacity-80" />
					<div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white">
						<span className="size-1.5 rounded-full bg-white/70" />
						Original
					</div>
					{hasOriginal ? (
						<button
							className="h-full w-full"
							type="button"
							onClick={() => onOpen(photo.id, selectedPhotos, 0)}
						>
							<img
								src={photo.originalUrl ?? ""}
								alt={`Original upload ${photoNumber}`}
								className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
								loading="lazy"
							/>
						</button>
					) : (
						<div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
							Original image unavailable
						</div>
					)}
					{hasOriginal ? (
						<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
							<button
								className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white hover:text-primary"
								type="button"
								onClick={() => onOpen(photo.id, selectedPhotos, 0)}
							>
								<Eye className="size-4" />
								View
							</button>
						</div>
					) : null}
				</div>
				<div className="flex flex-1 flex-col px-5 pb-5 pt-4">
					<div className="flex items-center justify-between">
						<p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
							<Sparkles className="size-3.5 text-primary" />
							Restorations
						</p>
						<span className="text-xs text-muted-foreground">
							{versionLabel}
						</span>
					</div>
					<div className="mb-4 mt-3 h-px w-full bg-border/70" />
					<div className="mb-4">
						<div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
							{!hasRestorations ? (
								<div className="text-xs text-muted-foreground">
									No restorations yet
								</div>
							) : (
								<>
									{completedRestorations.map((restoration) => (
										<RestoredThumbnail
											key={restoration.id}
											restoration={restoration}
											onOpen={onOpen}
											photoId={photo.id}
											photoSet={selectedPhotos}
											index={
												photoIndexByUrl.get(restoration.url ?? "") ??
												0
											}
										/>
									))}
									{pendingRestorations.map((restoration) => (
										<RestoredPlaceholder
											key={restoration.id}
											restoration={restoration}
										/>
									))}
								</>
							)}
						</div>
					</div>
					<div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
						<span>{formatDate(photo.createdAt)}</span>
						<span className="uppercase tracking-[0.3em]">Archive</span>
					</div>
				</div>
			</div>
		</article>
	);
}

function RestoredThumbnail({
	restoration,
	onOpen,
	photoId,
	photoSet,
	index,
}: {
	restoration: RestorationData;
	onOpen: (photoId: string, photoSet: SelectedPhoto[], index: number) => void;
	photoId: string;
	photoSet: SelectedPhoto[];
	index: number;
}) {
	if (!restoration.url) {
		return null;
	}

	return (
		<button
			className="relative flex-shrink-0"
			type="button"
			onClick={() => onOpen(photoId, photoSet, index)}
		>
			<img
				src={restoration.url}
				alt="Restored version"
				className="h-16 w-16 rounded-xl object-cover ring-1 ring-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:ring-2 hover:ring-primary/70"
				loading="lazy"
			/>
		</button>
	);
}

function RestoredPlaceholder({
	restoration,
}: {
	restoration: RestorationData;
}) {
	const label = restoration.status.toLowerCase();
	const isFailed = restoration.status === "FAILED";

	return (
		<div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/70 bg-muted/30 px-1 text-[10px] font-semibold uppercase text-muted-foreground">
			<span className="h-1 w-5 rounded-full bg-border/70" />
			{isFailed ? "Failed" : label}
		</div>
	);
}

function buildSelectedPhotos(photo: PhotoCardData): SelectedPhoto[] {
	const selectedPhotos: SelectedPhoto[] = [];

	if (photo.originalUrl) {
		selectedPhotos.push({
			url: photo.originalUrl,
			title: "Original",
			subtitle: formatDate(photo.createdAt),
		});
	}

	const completedRestorations = photo.restorations.filter(
		(restoration) => restoration.status === "COMPLETED" && restoration.url,
	);

	for (const restoration of completedRestorations) {
		if (!restoration.url) {
			continue;
		}

		selectedPhotos.push({
			url: restoration.url,
			title: "Restored version",
			subtitle: formatDate(restoration.createdAt),
		});
	}

	return selectedPhotos;
}

function EmptyState() {
	return (
		<div className="relative overflow-hidden rounded-3xl border border-dashed border-border/70 bg-muted/30 px-6 py-14 text-center">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_10%,rgba(255,255,255,0.18),transparent_60%)]" />
			<div className="relative flex flex-col items-center gap-4">
				<div className="flex size-14 items-center justify-center rounded-full border border-border/60 bg-background/70 shadow-sm">
					<ImageIcon className="size-6 text-primary" />
				</div>
				<div className="max-w-md">
					<h2 className="text-xl font-semibold text-foreground">
						No photos yet
					</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						Upload your first photo to start tracking restorations here.
					</p>
				</div>
			</div>
		</div>
	);
}

interface MyPhotosGalleryProps {
	photos: PhotoCardData[];
}

interface SelectedPhoto {
	url: string;
	title: string;
	subtitle?: string;
}

interface SelectedPhotoSet {
	photoId: string;
	photos: SelectedPhoto[];
	index: number;
}
