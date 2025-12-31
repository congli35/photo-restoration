"use client";

import type { ChangeEvent, ReactNode, Ref } from "react";
import { useState } from "react";
import { cn } from "@ui/lib";

export function ImageCompareSlider({
	afterImage,
	afterLabel,
	beforeImage,
	beforeLabel,
	className,
	defaultPosition = 50,
	frameClassName,
	frameRef,
	handle,
	handleClassName,
	inputAriaLabel = "Compare photos",
	isInteractive = true,
	onPositionChange,
	overlay,
	position,
}: ImageCompareSliderProps) {
	const [internalPosition, setInternalPosition] = useState(defaultPosition);
	const isControlled = typeof position === "number";
	const resolvedPosition = isControlled ? position : internalPosition;
	const currentPosition = clamp(resolvedPosition, 0, 100);
	const hasAfterImage = Boolean(afterImage);
	const isSliderInteractive = isInteractive && hasAfterImage;

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		const nextValue = Number(event.target.value);

		if (!isControlled) setInternalPosition(nextValue);

		onPositionChange?.(nextValue);
	}

	return (
		<div className={cn("relative", className)}>
			<div
				ref={frameRef}
				className={cn("relative overflow-hidden", frameClassName)}
			>
				{overlay}
				<img
					src={beforeImage.src}
					alt={beforeImage.alt}
					className={cn("w-full object-cover", beforeImage.className)}
				/>

				{beforeLabel ? (
					<div className="pointer-events-none absolute left-4 top-4 z-20">
						{beforeLabel}
					</div>
				) : null}

				{hasAfterImage && afterImage ? (
					<div
						className="absolute inset-0 z-10"
						style={{
							clipPath: `polygon(${currentPosition}% 0, 100% 0, 100% 100%, ${currentPosition}% 100%)`,
						}}
					>
						<img
							src={afterImage.src}
							alt={afterImage.alt}
							className={cn("w-full object-cover", afterImage.className)}
						/>
						{afterLabel ? (
							<div className="pointer-events-none absolute right-4 top-4 z-20">
								{afterLabel}
							</div>
						) : null}
					</div>
				) : null}

				{hasAfterImage ? (
					<div
						className="pointer-events-none absolute inset-y-0 z-20"
						style={{ left: `${currentPosition}%` }}
					>
						<div className="absolute inset-y-0 -translate-x-1/2 bg-white/70 shadow-[0_0_16px_rgba(255,255,255,0.6)]" />
						<div
							className={cn(
								"absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-black/40 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.4)]",
								handleClassName,
							)}
						>
							{handle ?? "Drag"}
						</div>
					</div>
				) : null}

				{isSliderInteractive ? (
					<input
						type="range"
						min={0}
						max={100}
						value={currentPosition}
						aria-label={inputAriaLabel}
						onChange={handleChange}
						className="absolute inset-0 z-30 h-full w-full cursor-ew-resize appearance-none bg-transparent opacity-0"
					/>
				) : null}
			</div>
		</div>
	);
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

interface ImageCompareImage {
	src: string;
	alt: string;
	className?: string;
}

interface ImageCompareSliderProps {
	beforeImage: ImageCompareImage;
	afterImage?: ImageCompareImage | null;
	beforeLabel?: ReactNode;
	afterLabel?: ReactNode;
	overlay?: ReactNode;
	handle?: ReactNode;
	className?: string;
	frameClassName?: string;
	frameRef?: Ref<HTMLDivElement>;
	handleClassName?: string;
	position?: number;
	defaultPosition?: number;
	onPositionChange?: (value: number) => void;
	isInteractive?: boolean;
	inputAriaLabel?: string;
}
