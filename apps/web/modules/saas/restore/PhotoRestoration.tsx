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
import { Code, Download, Loader2, Sparkles, Upload } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
	useCreateImageUploadUrl,
	useRestorationStatusQuery,
	useTriggerRestoration,
} from "./lib/api";

interface RestoredImage {
	id: string;
	url: string;
	base64: string;
}

const restorationImageCount = Number.parseInt(
	process.env.NEXT_PUBLIC_RESTORATION_IMAGE_COUNT ??
		process.env.RESTORATION_IMAGE_COUNT ??
		"3",
	10,
);

export function PhotoRestoration() {
	const [file, setFile] = useState<File | null>(null);
	const [originalPreview, setOriginalPreview] = useState<string | null>(null);
	const [restoredImages, setRestoredImages] = useState<RestoredImage[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [selectedImageIndex, setSelectedImageIndex] = useState(0);
	const [sliderPosition, setSliderPosition] = useState(50);
	const [taskHandle, setTaskHandle] = useState<string | null>(null);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [banner, setBanner] = useState<
		{ type: "success" | "error" | "info"; message: string } | null
	>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			const selectedFile = e.target.files[0];
			setFile(selectedFile);
			const objectUrl = URL.createObjectURL(selectedFile);
			setOriginalPreview(objectUrl);
			setRestoredImages([]);
			setTaskHandle(null);
			setIsSubmitting(false);
			setIsProcessing(false);
			setSelectedImageIndex(0);
		}
	};

	const createImageUploadUrlMutation = useCreateImageUploadUrl();
	const triggerRestorationMutation = useTriggerRestoration();
	const { data: restorationStatus } = useRestorationStatusQuery(taskHandle);

	// Handle photo restoration with S3 upload
	const handleRestore = async () => {
		if (!file) {
			return;
		}

		setIsSubmitting(true);
		setIsProcessing(true);
		setTaskHandle(null);

		try {
			console.log("[PhotoRestoration] Starting restoration process", {
				fileName: file.name,
				fileSize: file.size,
				fileType: file.type,
			});

			// 1. Get signed upload URL from backend
			const { signedUploadUrl, imageId } =
				await createImageUploadUrlMutation.mutateAsync({
					mimeType: file.type,
				});

			console.log("[PhotoRestoration] Got signed URL", {
				imageId,
				urlDomain: new URL(signedUploadUrl).hostname,
			});

			// 2. Upload file to S3
			console.log("[PhotoRestoration] Uploading to S3...");
			const uploadResponse = await fetch(signedUploadUrl, {
				method: "PUT",
				body: file,
				headers: {
					"Content-Type": file.type,
				},
			});

			console.log("[PhotoRestoration] S3 upload response", {
				status: uploadResponse.status,
				statusText: uploadResponse.statusText,
				headers: Object.fromEntries(uploadResponse.headers.entries()),
			});

			if (!uploadResponse.ok) {
				const errorText = await uploadResponse.text();
				console.error("[PhotoRestoration] S3 upload failed", {
					status: uploadResponse.status,
					errorText,
				});
				throw new Error(
					`Failed to upload image to S3: ${uploadResponse.status} ${uploadResponse.statusText}`,
				);
			}

			console.log("[PhotoRestoration] S3 upload successful");

			// 3. Trigger restoration
			const handle = await triggerRestorationMutation.mutateAsync({
				imageId,
			});

			console.log("[PhotoRestoration] Restoration triggered", { handle });

			setTaskHandle(handle);
			setBanner({
				type: "info",
				message:
					"Restoration started. Credits will be used only after images are generated. You can stay here, upload another photo, or check results later in My Photos.",
			});
			// Re-enable UI after task submission succeeds
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
		if (!file) {
			return;
		}
		setIsConfirmOpen(true);
	};

	const handleConfirmRestore = async () => {
		setIsConfirmOpen(false);
		await handleRestore();
	};

	const handleDownload = (index: number) => {
		const image = restoredImages[index];
		if (image) {
			const link = document.createElement("a");
			link.href = image.url;
			link.download = `restored-photo-${index + 1}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
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

	// Monitor restoration status
	useEffect(() => {
		if (!restorationStatus) {
			return;
		}

		if (
			restorationStatus.status === "COMPLETED" &&
			restorationStatus.output
		) {
			// Task completed successfully
			const output = restorationStatus.output as {
				count?: number;
				restorations?: Array<{
					restoredImageId: string;
					restoredImageBase64: string;
				}>;
			};

			if (output.restorations && output.restorations.length > 0) {
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
			} else if (
				restorationStatus.status === "FAILED" ||
				restorationStatus.status === "CRASHED"
			) {
				// Task failed
				setBanner({
					type: "error",
					message: "Restoration failed. Please try again.",
				});
				setTaskHandle(null);
			}
			setIsProcessing(false);
			setIsSubmitting(false);
		}
	}, [restorationStatus]);

	const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSliderPosition(Number(e.target.value));
	};

	const selectedRestoredImage =
		restoredImages.length > 0 ? restoredImages[selectedImageIndex] : null;

	const isRestoreDisabled =
		isSubmitting || isProcessing || createImageUploadUrlMutation.isPending;

	return (
		<>
			{banner && (
				<div
					className={`mb-4 w-full max-w-5xl rounded-lg border px-4 py-3 text-sm font-medium shadow-sm ${
						banner.type === "success"
							? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-100"
							: banner.type === "error"
								? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
								: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100"
					}`}
				>
					<div className="flex items-center justify-between gap-3">
						<span>{banner.message}</span>
						<Button size="sm" variant="outline" onClick={() => setBanner(null)}>
							OK
						</Button>
					</div>
				</div>
			)}
			<div className="w-full max-w-5xl flex flex-col items-center gap-8 font-display">
				{!originalPreview ? (
					<div className="w-full max-w-md p-8 bg-white dark:bg-card rounded-xl shadow-sm border border-border flex flex-col items-center gap-4">
						<div className="p-4 bg-primary/10 text-primary rounded-full">
							<Upload className="w-8 h-8" />
						</div>
						<div className="text-center">
							<h3 className="text-lg font-bold">Upload a Photo</h3>
							<p className="text-muted-foreground text-sm mt-1">
								Select a photo to restore and enhance
							</p>
						</div>
						<input
							type="file"
							accept="image/*"
							onChange={handleFileChange}
							className="hidden"
							id="photo-upload"
						/>
						<label htmlFor="photo-upload" className="w-full">
							<Button className="w-full cursor-pointer" asChild>
								<span>Select Photo</span>
							</Button>
						</label>
					</div>
				) : (
					<div className="w-full flex flex-col items-center gap-6">
						<div className="flex items-center gap-4 w-full justify-between">
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

							{restoredImages.length > 0 ? (
								<div className="flex gap-2">
									{restoredImages.length > 1 && (
										<Button
											onClick={handleDownloadAll}
											variant="outline"
											className="gap-2"
										>
											<Download className="w-4 h-4" />{" "}
											Download All
										</Button>
									)}
									<Button
										onClick={() =>
											handleDownload(selectedImageIndex)
										}
										className="gap-2"
									>
										<Download className="w-4 h-4" /> Download
									</Button>
								</div>
							) : (
								<Button
									onClick={openConfirm}
									disabled={isRestoreDisabled}
									className="gap-2"
								>
									{isSubmitting || isProcessing ? (
										<>Restoring...</>
									) : (
										<>
											<Sparkles className="w-4 h-4" /> Restore
											Photo
										</>
									)}
								</Button>
							)}
						</div>

						<div className="grid w-full items-stretch gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
							{/* Comparison Slider */}
							<div className="relative w-full bg-muted rounded-xl shadow-2xl overflow-hidden group border border-border">
								{isProcessing && (
									<div className="absolute inset-0 z-30 flex items-center justify-center gap-3 bg-black/40 backdrop-blur-sm text-white">
										<Loader2 className="h-5 w-5 animate-spin" />
										<span className="text-sm font-semibold text-center">
											Restoring photo… credit is only deducted after all versions finish.
										</span>
									</div>
								)}
								{/* Background Grid */}
								<div
									className="absolute inset-0 opacity-10 pointer-events-none"
									style={{
										backgroundImage:
											"radial-gradient(currentColor 1px, transparent 1px)",
										backgroundSize: "20px 20px",
									}}
								/>

								{/* Container for images */}
								<div className="relative w-full" ref={containerRef}>
									{/* Original Image (Left Side / Underneath) */}
									<div className="relative w-full">
										<img
											src={originalPreview}
											alt="Original"
											className="w-full h-auto block"
										/>
										<div className="absolute top-6 left-6 z-20">
											<div className="bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 transition-transform hover:scale-105 duration-300">
												<div className="flex flex-col text-start">
													<span className="text-sm font-bold text-white tracking-wide">
														Original
													</span>
												</div>
											</div>
										</div>
									</div>

									{/* Restored Image (Overlaid, clipped) */}
									{selectedRestoredImage && (
										<div
											className="absolute inset-0 w-full h-full select-none overflow-hidden"
											style={{
												clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
											}}
										>
											<img
												src={selectedRestoredImage.url}
												alt="Restored"
												className="w-full h-full object-cover"
											/>
											<div className="absolute top-6 right-6 z-20">
												<div className="bg-primary/90 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-lg shadow-glow flex items-center gap-3 transition-transform hover:scale-105 duration-300">
													<div className="flex flex-col items-end">
														<span className="text-sm font-bold text-white tracking-wide flex items-center gap-1">
															AI Enhanced
															<Sparkles className="w-3.5 h-3.5" />
														</span>
													</div>
												</div>
											</div>
										</div>
									)}

									{/* Slider Handle */}
									{selectedRestoredImage && (
										<div
											className="absolute inset-y-0 left-1/2 w-0.5 bg-white/50 z-20 cursor-ew-resize group-hover:bg-white transition-colors duration-200"
											style={{ left: `${sliderPosition}%` }}
										>
											<div className="absolute inset-y-0 -left-16 w-32 bg-transparent z-40 cursor-ew-resize" />
											<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-12 bg-white/10 backdrop-blur-md rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_8px_16px_rgba(0,0,0,0.3)] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95">
												<div className="size-8 bg-white rounded-full flex items-center justify-center text-primary shadow-sm relative">
													<Code className="w-5 h-5 font-bold" />
												</div>
												<div className="absolute inset-0 rounded-full border-2 border-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
											</div>
											<div className="absolute top-0 bottom-0 -left-[1px] w-[3px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
										</div>
									)}

									{/* Hidden Range Input for Interaction */}
									{selectedRestoredImage && (
										<input
											type="range"
											min="0"
											max="100"
											value={sliderPosition}
											onChange={handleSliderChange}
											className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
											style={{ margin: 0 }}
										/>
									)}
								</div>
							</div>

							<div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-muted/30">
								<div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm font-semibold text-muted-foreground">
									<span>Restored Images</span>
									<span>{restoredImages.length}</span>
								</div>
								{restoredImages.length > 0 ? (
									<div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
										{restoredImages.map((image, index) => (
											<button
												key={image.id}
												onClick={() => setSelectedImageIndex(index)}
												className={`relative w-full overflow-hidden rounded-lg border-2 transition-all ${
													selectedImageIndex === index
														? "border-primary ring-2 ring-primary/20"
														: "border-border hover:border-primary/50"
												}`}
											>
												<img
													src={image.url}
													alt={`Variation ${index + 1}`}
													className="h-32 w-full object-cover"
												/>
												<div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
													#{index + 1}
												</div>
											</button>
										))}
									</div>
								) : (
									<div className="flex min-h-[240px] items-center justify-center px-4 text-sm text-muted-foreground">
										No restored images yet.
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
			<Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Consume 1 credit?</DialogTitle>
						<DialogDescription>
							Restoring this photo will use 1 credit and generate up to{" "}
							{restorationImageCount} restored version
							{restorationImageCount > 1 ? "s" : ""}. Credit is only deducted
							after all versions are generated successfully. Do you want to
							continue?
						</DialogDescription>
					</DialogHeader>
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
