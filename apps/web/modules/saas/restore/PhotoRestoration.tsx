"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { cn } from "@ui/lib";
import {
	defaultRestorationResolution,
	getRestorationResolutionOption,
	restorationResolutionOptions,
	type RestorationResolution,
} from "@repo/utils";
import { Download, Loader2, Sparkles, Upload } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { ImageCompareSlider } from "@shared/components/ImageCompareSlider";
import {
	createImagePreviewUrl,
	revokePreviewUrl,
} from "@shared/lib/image-preview";
import {
	useCreateImageUploadUrl,
	useRestorationStatusQuery,
	useTriggerRestoration,
} from "./lib/api";

export function PhotoRestoration() {
	const [file, setFile] = useState<File | null>(null);
	const [originalPreview, setOriginalPreview] = useState<string | null>(null);
	const [restoredImages, setRestoredImages] = useState<RestoredImage[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isPreviewConverting, setIsPreviewConverting] = useState(false);
	const [selectedImageIndex, setSelectedImageIndex] = useState(0);
	const [sliderPosition, setSliderPosition] = useState(50);
	const [taskHandle, setTaskHandle] = useState<string | null>(null);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [banner, setBanner] = useState<BannerMessage | null>(null);
	const [selectedResolution, setSelectedResolution] =
		useState<RestorationResolution>(defaultRestorationResolution);
	const beforeAfterRef = useRef<HTMLDivElement>(null);
	const variationsListRef = useRef<HTMLDivElement>(null);

	const createImageUploadUrlMutation = useCreateImageUploadUrl();
	const triggerRestorationMutation = useTriggerRestoration();
	const { data: restorationStatus } = useRestorationStatusQuery(taskHandle);

	const handleFileChange = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		if (!e.target.files?.[0]) return;

		const selectedFile = e.target.files[0];
		if (!isSupportedImageType(selectedFile.type)) {
			setBanner({
				type: "error",
				message: `Unsupported file type. Supported formats: ${supportedImageBadgeLabel}.`,
			});
			e.target.value = "";
			return;
		}
		setFile(selectedFile);
		setOriginalPreview(null);
		setIsPreviewConverting(true);
		try {
			const previewUrl = await createImagePreviewUrl({ file: selectedFile });
			setOriginalPreview(previewUrl);
		} catch (error) {
			console.error("[PhotoRestoration] Preview error:", error);
			setOriginalPreview(URL.createObjectURL(selectedFile));
			setBanner({
				type: "error",
				message:
					"Preview generation failed for this file. We'll still upload the original image.",
			});
		} finally {
			setIsPreviewConverting(false);
		}
		setRestoredImages([]);
		setTaskHandle(null);
		setIsSubmitting(false);
		setIsProcessing(false);
		setSelectedImageIndex(0);
	};

	const handleRestore = async () => {
		if (!file) return;

		setIsSubmitting(true);
		setIsProcessing(true);
		setTaskHandle(null);

		try {
			const { signedUploadUrl, imageId } =
				await createImageUploadUrlMutation.mutateAsync({
					mimeType: file.type,
				});

			const uploadResponse = await fetch(signedUploadUrl, {
				method: "PUT",
				body: file,
				headers: {
					"Content-Type": file.type,
				},
			});

			if (!uploadResponse.ok) {
				const errorText = await uploadResponse.text();
				throw new Error(
					`Failed to upload image to S3: ${uploadResponse.status} ${uploadResponse.statusText} ${errorText}`,
				);
			}

			const handle = await triggerRestorationMutation.mutateAsync({
				imageId,
				resolution: selectedResolution,
			});

			setTaskHandle(handle);
			setBanner({
				type: "info",
				message:
					"Restoration started. Credits are used only after results are generated. You can stay here, upload another photo, or check later in My Photos.",
			});
			setIsSubmitting(false);
		} catch (error) {
			console.error("[PhotoRestoration] Error:", error);
			setBanner({
				type: "error",
				message:
					"Failed to start restoration. No credits were used. Please try again.",
			});
			setIsSubmitting(false);
			setIsProcessing(false);
		}
	};

	const openConfirm = () => {
		if (!file) return;
		setIsConfirmOpen(true);
	};

	const handleConfirmRestore = async () => {
		setIsConfirmOpen(false);
		await handleRestore();
	};

	const handleDownload = (index: number) => {
		const image = restoredImages[index];
		if (!image) return;

		const link = document.createElement("a");
		link.href = image.url;
		link.download = `restored-photo-${index + 1}.png`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleDownloadAll = () => {
		restoredImages.forEach((_, index) => {
			setTimeout(() => handleDownload(index), index * 100);
		});
		setBanner({
			type: "success",
			message: `Downloading ${restoredImages.length} images...`,
		});
	};

	useEffect(() => {
		if (!restorationStatus) return;

		if (
			restorationStatus.status === "COMPLETED" &&
			restorationStatus.output
		) {
			const output = restorationStatus.output as {
				count?: number;
				restorations?: Array<{
					restoredImageId: string;
					restoredImageBase64: string;
				}>;
			};

			if (output.restorations?.length) {
				const images: RestoredImage[] = output.restorations.map(
					(restoration) => ({
						id: restoration.restoredImageId,
						url: `data:image/png;base64,${restoration.restoredImageBase64}`,
						base64: restoration.restoredImageBase64,
					}),
				);
				setRestoredImages(images);
				setBanner({
					type: "success",
					message: `${images.length} photo${images.length > 1 ? "s" : ""} restored successfully!`,
				});
			}

			setIsProcessing(false);
			setIsSubmitting(false);
			return;
		}

		if (
			restorationStatus.status === "FAILED" ||
			restorationStatus.status === "CRASHED"
		) {
			setBanner({
				type: "error",
				message: "Restoration failed. Please try again.",
			});
			setTaskHandle(null);
			setIsProcessing(false);
			setIsSubmitting(false);
		}
	}, [restorationStatus]);

	useEffect(() => {
		return () => {
			revokePreviewUrl(originalPreview);
		};
	}, [originalPreview]);

	useEffect(() => {
		const beforeAfter = beforeAfterRef.current;
		const variationsList = variationsListRef.current;

		if (!beforeAfter || !variationsList) return;

		const updateHeight = () => {
			const height = beforeAfter.getBoundingClientRect().height;
			variationsList.style.height = `${height}px`;
		};

		updateHeight();
		const resizeObserver = new ResizeObserver(updateHeight);
		resizeObserver.observe(beforeAfter);

		return () => resizeObserver.disconnect();
	}, [file, originalPreview, restoredImages, selectedImageIndex]);

	const handleSliderChange = (value: number) => {
		setSliderPosition(value);
	};

	const selectedRestoredImage = restoredImages[selectedImageIndex] ?? null;
	const hasRestorations = restoredImages.length > 0;
	const hasFile = Boolean(file);
	const hasPreview = Boolean(originalPreview);
	const isRestoreDisabled =
		isSubmitting ||
		isProcessing ||
		isPreviewConverting ||
		createImageUploadUrlMutation.isPending;
	const selectedResolutionOption =
		getRestorationResolutionOption(selectedResolution);
	const creditsLabel = formatCreditsLabel(
		selectedResolutionOption.credits,
	);

		return (
			<>
				<section className="relative w-full max-w-6xl font-display">
					<div className="pointer-events-none absolute -left-24 top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
					<div className="pointer-events-none absolute -right-32 bottom-12 size-64 rounded-full bg-primary/10 blur-3xl" />
					<div className="relative">
						<div className="relative px-2 py-6 sm:px-4 md:px-6 md:py-8">
							<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
							<div className="relative flex flex-col items-center gap-3 text-center md:gap-4">
								<div className="flex items-center justify-center gap-3 text-xs uppercase tracking-[0.35em] text-muted-foreground">
									<span className="size-2 rounded-full bg-primary" />
									Photo Restoration
								</div>
								<h2 className="text-2xl font-semibold text-foreground md:text-4xl">
									Upload, restore, and compare in one flow.
								</h2>
								<p className="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base">
									Drop a photo, then review up to {restorationImageCount} restored
									versions side by side.
								</p>
							</div>
						</div>

							{banner && (
								<div className="mt-4 px-2 sm:px-4 md:px-6">
									<Banner
										message={banner.message}
										type={banner.type}
										onDismiss={() => setBanner(null)}
									/>
								</div>
							)}
							{hasFile && (
								<div className="mt-4 flex flex-wrap items-center gap-3 px-2 sm:px-4 md:px-6">
									<Button
										variant="outline"
										onClick={() => {
											setFile(null);
											setOriginalPreview(null);
											setRestoredImages([]);
											setTaskHandle(null);
											setIsSubmitting(false);
											setIsProcessing(false);
										}}
										disabled={isSubmitting}
									>
										Upload New
									</Button>
									<div className="ml-auto flex flex-wrap gap-2">
										{hasRestorations ? (
											<>
												{restoredImages.length > 1 && (
													<Button
														onClick={handleDownloadAll}
														variant="outline"
														className="gap-2"
													>
														<Download className="h-4 w-4" /> Download All
													</Button>
												)}
												<Button
													onClick={() => handleDownload(selectedImageIndex)}
													className="gap-2"
												>
													<Download className="h-4 w-4" /> Download
												</Button>
											</>
										) : (
											<Button
												onClick={openConfirm}
												disabled={isRestoreDisabled}
												className="gap-2"
											>
												{isSubmitting || isProcessing ? (
													<>Restoring...</>
												) : isPreviewConverting ? (
													<>Preparing preview...</>
												) : (
													<>
														<Sparkles className="h-4 w-4" /> Restore Photo
													</>
												)}
											</Button>
										)}
									</div>
								</div>
							)}
							<div className="mt-6 grid items-start gap-8 px-2 pb-2 sm:px-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] md:px-6 md:pb-4">
								<div className="space-y-6">
									{!hasFile ? (
										<div className="group relative overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background p-6 transition duration-500 hover:-translate-y-0.5 hover:border-primary/50 md:p-8">
										<div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.12)_1px,transparent_0)] [background-size:22px_22px] dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)]" />
										<div className="relative flex flex-col gap-6">
											<div className="flex items-center gap-4">
												<div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary shadow-[0_12px_32px_rgba(0,0,0,0.15)] transition duration-500 group-hover:scale-[1.04]">
													<Upload className="size-6" />
												</div>
												<div>
													<h3 className="text-xl font-semibold text-foreground">
														Upload a photo to restore
													</h3>
													<p className="text-sm text-muted-foreground">
														Scanned prints, phone captures, or vintage negatives.
													</p>
												</div>
											</div>
										<input
											type="file"
											accept={supportedImageMimeTypes.join(",")}
											onChange={handleFileChange}
											className="hidden"
											id="photo-upload"
										/>
										<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
											<label htmlFor="photo-upload" className="w-full sm:w-auto">
												<Button className="w-full sm:w-auto" asChild>
													<span>Select Photo</span>
												</Button>
											</label>
											<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
												<span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
													{supportedImageBadgeLabel}
												</span>
												<span className="rounded-full border border-border/60 bg-background/70 px-3 py-1">
													Up to {restorationImageCount} variations
												</span>
											</div>
										</div>
										<div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-xs text-muted-foreground">
											Gentle retouching with film-like grain retention and tonal balance.
										</div>
									</div>
								</div>
								) : (
									<div className="space-y-6">
										<div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-muted/30 transition duration-500 hover:-translate-y-0.5 hover:border-primary/40">
										<div className="flex items-center justify-between border-b border-border/60 px-4 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
											<span>Before / After</span>
											<span className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[10px] font-semibold text-foreground">
												{selectedRestoredImage ? "Enhanced" : "Awaiting Output"}
											</span>
										</div>
										{hasPreview ? (
											<ImageCompareSlider
												frameRef={beforeAfterRef}
												frameClassName="relative"
												beforeImage={{
													src: originalPreview ?? "",
													alt: "Original",
													className:
														"w-full object-cover transition duration-700 group-hover:scale-[1.01]",
												}}
												afterImage={
													selectedRestoredImage
														? {
																src: selectedRestoredImage.url,
																alt: "Restored",
																className:
																	"h-full w-full object-cover transition duration-700 group-hover:scale-[1.01]",
															}
														: null
												}
												beforeLabel={
													<span className="rounded-full border border-white/30 bg-black/50 px-3 py-1 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(0,0,0,0.25)]">
														Original
													</span>
												}
												afterLabel={
													<span className="flex items-center gap-2 rounded-full border border-white/30 bg-primary/80 px-3 py-1 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(0,0,0,0.25)]">
														<Sparkles className="size-3" /> AI Enhanced
													</span>
												}
												handle={<Sparkles className="h-5 w-5" />}
												handleClassName="bg-white/90 text-primary shadow-[0_15px_30px_rgba(0,0,0,0.25)] transition duration-300 group-hover:scale-105"
												overlay={
													isProcessing ? (
														<div className="absolute inset-0 z-30 flex items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
															<Loader2 className="h-5 w-5 animate-spin text-primary" />
															<span className="text-sm font-medium text-foreground">
																Restoring photo... credits apply after completion.
															</span>
														</div>
													) : null
												}
												position={sliderPosition}
												onPositionChange={handleSliderChange}
												isInteractive={Boolean(selectedRestoredImage)}
												inputAriaLabel="Compare original and restored photo"
											/>
										) : (
											<div
												ref={beforeAfterRef}
												className="relative flex min-h-[320px] items-center justify-center"
											>
												<div className="flex items-center gap-3 text-sm text-muted-foreground">
													<Loader2 className="h-5 w-5 animate-spin text-primary" />
													<span>Preparing preview...</span>
												</div>
											</div>
										)}
									</div>

									<div className="flex items-center gap-3 text-xs text-muted-foreground">
										<span className="size-2 rounded-full bg-primary/80" />
										Drag the slider to compare texture, light, and contrast.
									</div>
								</div>
							)}
						</div>

						<aside className="flex flex-col gap-4">
							<div className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/60 transition duration-500 hover:-translate-y-0.5 hover:border-primary/40">
								<div className="flex items-center justify-between border-b border-border/60 px-4 py-3 text-sm font-semibold">
									<span>Variations</span>
									<span className="text-xs text-muted-foreground">
										{hasRestorations ? restoredImages.length : 0} of{" "}
										{restorationImageCount}
									</span>
								</div>
								<div
									ref={variationsListRef}
									className="grid min-h-0 gap-5 p-4 pr-3 overflow-y-auto"
								>
									{hasRestorations ? (
										restoredImages.map((image, index) => (
											<button
												key={image.id}
												onClick={() => setSelectedImageIndex(index)}
												className={cn(
													"group relative rounded-xl border-2 transition duration-300",
													selectedImageIndex === index
														? "border-primary/80 shadow-[0_10px_25px_rgba(0,0,0,0.18)]"
														: "border-border hover:border-primary/40",
												)}
											>
												<div className="flex h-48 w-full items-center justify-center bg-muted/40 p-2">
													<img
														src={image.url}
														alt={`Variation ${index + 1}`}
														className="max-h-full max-w-full object-contain"
													/>
												</div>
												<div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white">
													#{index + 1}
												</div>
											</button>
										))
									) : (
										<div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 text-xs text-muted-foreground">
											No restored images yet.
										</div>
									)}
								</div>
								<div className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
									Pick the version that best preserves the original atmosphere.
								</div>
							</div>

							{hasFile && !hasRestorations && (
								<div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-xs text-muted-foreground">
									<span className="font-semibold text-foreground">Ready to restore?</span>{" "}
									Confirm to begin processing your photo.
								</div>
							)}
						</aside>
					</div>
				</div>
			</section>
			<Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Consume {creditsLabel}?</DialogTitle>
						<DialogDescription>
							Choose an output resolution, then confirm to start processing.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 text-sm text-muted-foreground">
						<div className="space-y-3">
							<div className="flex items-center justify-between text-sm font-semibold text-foreground">
								<span>Output resolution</span>
								<span className="text-xs font-normal text-muted-foreground">
									Credits scale with size
								</span>
							</div>
							<div
								className="grid gap-2 sm:grid-cols-3"
								role="radiogroup"
								aria-label="Output resolution"
							>
								{restorationResolutionOptions.map((option) => {
									const isSelected = option.id === selectedResolution;

									return (
										<Button
											key={option.id}
											type="button"
											variant={isSelected ? "primary" : "outline"}
											onClick={() => setSelectedResolution(option.id)}
											disabled={isSubmitting || isProcessing}
											role="radio"
											aria-checked={isSelected}
											className={cn(
												"h-auto w-full flex-col items-start gap-1 px-3 py-2 text-left",
												isSelected
													? "shadow-[0_10px_25px_rgba(0,0,0,0.18)]"
													: "hover:border-primary/40",
											)}
										>
											<span
												className={cn(
													"text-sm font-semibold",
													isSelected
														? "text-primary-foreground"
														: "text-foreground",
												)}
											>
												{option.label}
											</span>
											<span
												className={cn(
													"text-xs",
													isSelected
														? "text-primary-foreground/80"
														: "text-muted-foreground",
												)}
											>
												{formatCreditsLabel(option.credits)}
											</span>
										</Button>
									);
								})}
							</div>
						</div>
						<div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm text-foreground">
							<span className="font-semibold">{creditsLabel}</span> unlocks
							up to{" "}
							<span className="font-semibold">{restorationImageCount}</span>{" "}
							restored version{restorationImageCount > 1 ? "s" : ""} at{" "}
							<span className="font-semibold">
								{selectedResolutionOption.label}
							</span>{" "}
							output.
						</div>
						<ul className="space-y-3">
							<li className="flex gap-3">
								<span className="mt-1 size-2 rounded-full bg-primary/70" />
								<span>Credits are charged only after output is generated.</span>
							</li>
							<li className="flex gap-3">
								<span className="mt-1 size-2 rounded-full bg-primary/70" />
								<span>You can download each version once processing finishes.</span>
							</li>
						</ul>
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="outline"
							onClick={() => setIsConfirmOpen(false)}
							type="button"
						>
							Cancel
						</Button>
						<Button
							onClick={handleConfirmRestore}
							loading={isSubmitting}
							type="button"
						>
							Confirm
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function Banner({ message, onDismiss, type }: BannerProps) {
	return (
		<div
			className={cn(
				"mb-4 w-full max-w-6xl rounded-2xl border px-4 py-3 text-sm shadow-sm",
				bannerStyles[type],
			)}
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<span className={cn("size-2 rounded-full", bannerDots[type])} />
					<span>{message}</span>
				</div>
				<Button size="sm" variant="ghost" onClick={onDismiss}>
					Dismiss
				</Button>
			</div>
		</div>
	);
}

function formatCreditsLabel(credits: number) {
	return `${credits} credit${credits === 1 ? "" : "s"}`;
}

function isSupportedImageType(mimeType: string) {
	return supportedImageMimeTypes.includes(mimeType);
}

const supportedImageFormats = [
	{ label: "PNG", mimeType: "image/png" },
	{ label: "JPEG", mimeType: "image/jpeg" },
	{ label: "WEBP", mimeType: "image/webp" },
	{ label: "HEIC", mimeType: "image/heic" },
	{ label: "HEIF", mimeType: "image/heif" },
] satisfies SupportedImageFormat[];

const supportedImageMimeTypes = supportedImageFormats.map(
	(format) => format.mimeType,
);
const supportedImageBadgeLabel = supportedImageFormats
	.map((format) => format.label)
	.join(" / ");

const bannerStyles = {
	success:
		"border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100",
	error:
		"border-rose-200/80 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-100",
	info:
		"border-sky-200/80 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-100",
} satisfies Record<BannerMessage["type"], string>;

const bannerDots = {
	success: "bg-emerald-500",
	error: "bg-rose-500",
	info: "bg-sky-500",
} satisfies Record<BannerMessage["type"], string>;

const restorationImageCount = Number.parseInt(
	process.env.NEXT_PUBLIC_RESTORATION_IMAGE_COUNT ??
		process.env.RESTORATION_IMAGE_COUNT ??
		"3",
	10,
);

interface RestoredImage {
	id: string;
	url: string;
	base64: string;
}

interface SupportedImageFormat {
	label: string;
	mimeType: string;
}

interface BannerMessage {
	type: "success" | "error" | "info";
	message: string;
}

interface BannerProps extends BannerMessage {
	onDismiss: () => void;
}
