export function formatDate(date: string | Date) {
	const parsedDate = typeof date === "string" ? new Date(date) : date;

	if (Number.isNaN(parsedDate.getTime())) {
		return "";
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(parsedDate);
}

export function formatVersionLabel(count: number) {
	if (count === 0) {
		return "No restorations";
	}

	return `${count} version${count === 1 ? "" : "s"}`;
}

export function getGalleryTitle(name: string) {
	const trimmed = name.trim();

	if (!trimmed) {
		return "Your Gallery";
	}

	const possessive = trimmed.endsWith("s")
		? `${trimmed}'`
		: `${trimmed}'s`;

	return `${possessive} Gallery`;
}
