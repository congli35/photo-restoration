export const restorationResolutionIds = ["1k", "2k", "4k"] as const;

export type RestorationResolution = (typeof restorationResolutionIds)[number];

export interface RestorationResolutionOption {
	id: RestorationResolution;
	label: string;
	credits: number;
}

export const defaultRestorationResolution: RestorationResolution = "1k";

export const restorationResolutionOptions = [
	{ id: "1k", label: "1K", credits: 1 },
	{ id: "2k", label: "2K", credits: 2 },
	{ id: "4k", label: "4K", credits: 3 },
] satisfies RestorationResolutionOption[];

export function getRestorationResolutionOption(
	resolution: RestorationResolution | undefined,
): RestorationResolutionOption {
	if (!resolution) return restorationResolutionOptions[0];

	return (
		restorationResolutionOptions.find(
			(option) => option.id === resolution,
		) ?? restorationResolutionOptions[0]
	);
}

export function getRestorationCredits(
	resolution: RestorationResolution | undefined,
): number {
	return getRestorationResolutionOption(resolution).credits;
}

export function getRestorationResolutionLabel(
	resolution: RestorationResolution | undefined,
): string {
	return getRestorationResolutionOption(resolution).label;
}
