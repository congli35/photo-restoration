"use client";

import type { PhotoCardData, RestorationData } from "@saas/photos/types";
import { formatDate, formatVersionLabel } from "@saas/photos/utils";
import { Button } from "@ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@ui/components/dialog";
import {
	ChevronLeft,
	ChevronRight,
	Download,
	Eye,
	Image as ImageIcon,
	Sparkles,
} from "lucide-react";
import { useState } from "react";

export function MyPhotosGallery({ photos }: MyPhotosGalleryProps) {
	const [selectedPhotoSet, setSelectedPhotoSet] =
		useState<SelectedPhotoSet | null>(null);

	const selectedPhoto = selectedPhotoSet
		? selectedPhotoSet.photos[selectedPhotoSet.index]
		: null;

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setSelectedPhotoSet(null);
		}
	};

	const handleOpenPhoto = (photoSet: SelectedPhoto[], index: number) => {
		if (photoSet.length === 0) {
			return;
		}

		setSelectedPhotoSet({
			photos: photoSet,
			index,
		});
	};

	const handlePrevious = () => {
		setSelectedPhotoSet((currentSet) => {
			if (!currentSet || currentSet.index <= 0) {
				return currentSet;
			}

			return {
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
						/>
					))}
				</div>
			)}

			<Dialog
				open={Boolean(selectedPhotoSet)}
				onOpenChange={handleOpenChange}
			>
				<DialogContent className="max-w-4xl border-border/70 bg-card p-6">
					<div className="flex flex-col gap-4">
						<div className="flex items-start justify-between gap-4 pr-10">
							<div className="space-y-1">
								<DialogTitle className="text-lg font-semibold">
									{selectedPhoto?.title}
								</DialogTitle>
								{selectedPhoto?.subtitle ? (
									<p className="text-sm text-muted-foreground">
										{selectedPhoto.subtitle}
									</p>
								) : null}
							</div>
							<Button
								className="gap-2"
								type="button"
								onClick={handleDownload}
							>
								<Download className="size-4" />
								Download
							</Button>
						</div>
						<div className="relative">
							{selectedPhoto?.url ? (
								<img
									src={selectedPhoto.url}
									alt={selectedPhoto.title}
									className="max-h-[70vh] w-full rounded-xl bg-muted/30 object-contain"
									loading="eager"
								/>
							) : null}
							{selectedPhotoSet &&
							selectedPhotoSet.photos.length > 1 ? (
								<>
									<button
										className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/80 disabled:opacity-30"
										type="button"
										onClick={handlePrevious}
										disabled={selectedPhotoSet.index === 0}
									>
										<ChevronLeft className="size-6" />
									</button>
									<button
										className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/80 disabled:opacity-30"
										type="button"
										onClick={handleNext}
										disabled={
											selectedPhotoSet.index ===
											selectedPhotoSet.photos.length - 1
										}
									>
										<ChevronRight className="size-6" />
									</button>
								</>
							) : null}
						</div>
						{selectedPhotoSet &&
						selectedPhotoSet.photos.length > 1 ? (
							<div className="text-center text-sm text-muted-foreground">
								{selectedPhotoSet.index + 1} /{" "}
								{selectedPhotoSet.photos.length}
							</div>
						) : null}
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
}: {
	photo: PhotoCardData;
	photoNumber: number;
	onOpen: (photoSet: SelectedPhoto[], index: number) => void;
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

	return (
		<div className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition hover:shadow-lg">
			<div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40">
				<div className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
					Original
				</div>
				{photo.originalUrl ? (
					<button
						className="h-full w-full"
						type="button"
						onClick={() =>
							onOpen(selectedPhotos, 0)
						}
					>
						<img
							src={photo.originalUrl}
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
				{photo.originalUrl ? (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
						<button
							className="pointer-events-auto rounded-full bg-white/20 p-2.5 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white hover:text-primary"
							type="button"
							onClick={() =>
								onOpen(selectedPhotos, 0)
							}
						>
							<Eye className="size-5" />
						</button>
					</div>
				) : null}
			</div>
			<div className="flex flex-1 flex-col p-5">
				<div className="mb-4">
					<p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
						<Sparkles className="size-3.5 text-primary" />
						Restored Versions
					</p>
				</div>
				<div className="mb-4 h-px w-full bg-border/70" />
				<div className="mb-4">
					<div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
						{completedRestorations.length === 0 &&
						pendingRestorations.length === 0 ? (
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
										photoSet={selectedPhotos}
										index={
											photoIndexByUrl.get(
												restoration.url ?? "",
											) ?? 0
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
				<div className="mt-auto pt-2">
					<p className="text-xs text-muted-foreground">
						{formatDate(photo.createdAt)} • {versionLabel}
					</p>
				</div>
			</div>
		</div>
	);
}

function RestoredThumbnail({
	restoration,
	onOpen,
	photoSet,
	index,
}: {
	restoration: RestorationData;
	onOpen: (photoSet: SelectedPhoto[], index: number) => void;
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
			onClick={() => onOpen(photoSet, index)}
		>
			<img
				src={restoration.url}
				alt="Restored version"
				className="h-16 w-16 rounded-lg object-cover ring-1 ring-border/70 transition-all hover:ring-2 hover:ring-primary"
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
		<div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/40 text-[10px] font-semibold uppercase text-muted-foreground">
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
		<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/30 px-6 py-12 text-center">
			<div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
				<ImageIcon className="size-6" />
			</div>
			<div className="max-w-md">
				<h2 className="text-lg font-semibold text-foreground">
					No photos yet
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Upload your first photo to start tracking restorations here.
				</p>
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
	photos: SelectedPhoto[];
	index: number;
}
