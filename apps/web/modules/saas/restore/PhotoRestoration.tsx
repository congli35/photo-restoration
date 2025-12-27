"use client";

import { Button } from "@ui/components/button";
import { Code, Download, Sparkles, Upload } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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

export function PhotoRestoration() {
	const [file, setFile] = useState<File | null>(null);
	const [originalPreview, setOriginalPreview] = useState<string | null>(null);
	const [restoredImages, setRestoredImages] = useState<RestoredImage[]>([]);
	const [isRestoring, setIsRestoring] = useState(false);
	const [selectedImageIndex, setSelectedImageIndex] = useState(0);
	const [sliderPosition, setSliderPosition] = useState(50);
	const [taskHandle, setTaskHandle] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			const selectedFile = e.target.files[0];
			setFile(selectedFile);
			const objectUrl = URL.createObjectURL(selectedFile);
			setOriginalPreview(objectUrl);
			setRestoredImages([]);
			setTaskHandle(null);
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

		setIsRestoring(true);
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
			toast.success("Restoration started!");
		} catch (error) {
			console.error("[PhotoRestoration] Error:", error);
			toast.error("Failed to start restoration. Please try again.");
			setIsRestoring(false);
		}
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
		toast.success(`Downloading ${restoredImages.length} images...`);
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
				toast.success(
					`${images.length} photo${images.length > 1 ? "s" : ""} restored successfully!`,
				);
			}
			setIsRestoring(false);
		} else if (
			restorationStatus.status === "FAILED" ||
			restorationStatus.status === "CRASHED"
		) {
			// Task failed
			toast.error("Restoration failed. Please try again.");
			setIsRestoring(false);
			setTaskHandle(null);
		}
	}, [restorationStatus]);

	const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSliderPosition(Number(e.target.value));
	};

	const selectedRestoredImage =
		restoredImages.length > 0 ? restoredImages[selectedImageIndex] : null;

	return (
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
							}}
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
								onClick={handleRestore}
								disabled={isRestoring}
								className="gap-2"
							>
								{isRestoring ? (
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

					{/* Comparison Slider */}
					<div className="relative w-full bg-muted rounded-xl shadow-2xl overflow-hidden group border border-border">
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

					{/* Image Gallery - Show thumbnails when multiple images */}
					{restoredImages.length > 1 && (
						<div className="w-full">
							<h3 className="text-sm font-semibold mb-3 text-muted-foreground">
								{restoredImages.length} Variations Generated
							</h3>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								{restoredImages.map((image, index) => (
									<button
										key={image.id}
										onClick={() =>
											setSelectedImageIndex(index)
										}
										className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
											selectedImageIndex === index
												? "border-primary ring-2 ring-primary/20 scale-105"
												: "border-border hover:border-primary/50"
										}`}
									>
										<img
											src={image.url}
											alt={`Variation ${index + 1}`}
											className="w-full h-full object-cover"
										/>
										<div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
											#{index + 1}
										</div>
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
