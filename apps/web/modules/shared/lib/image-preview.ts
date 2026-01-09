const heicMimeTypes = ["image/heic", "image/heif"];
const heicExtensions = ["heic", "heif"];

export interface ImagePreviewSource {
	file?: File | Blob;
	url?: string;
	fileName?: string;
	mimeType?: string;
}

export function isBlobUrl(value?: string | null): value is string {
	return Boolean(value?.startsWith("blob:"));
}

export function revokePreviewUrl(value?: string | null) {
	if (!isBlobUrl(value)) return;
	URL.revokeObjectURL(value);
}

export function isHeicMimeType(mimeType?: string) {
	if (!mimeType) return false;
	return heicMimeTypes.includes(mimeType);
}

export function isHeicFileName(value?: string) {
	if (!value) return false;
	const cleanValue = value.split("?")[0] ?? value;
	const extension = getFileExtension(cleanValue);
	return Boolean(extension && heicExtensions.includes(extension));
}

export function isHeicSource(source: ImagePreviewSource) {
	const mimeType =
		source.mimeType ??
		(source.file && "type" in source.file ? source.file.type : undefined);
	const fileName =
		source.file && "name" in source.file ? source.file.name : undefined;
	const fileReference = fileName ?? source.fileName ?? source.url;

	return isHeicMimeType(mimeType) || isHeicFileName(fileReference);
}

export function shouldCreateImagePreview(source: ImagePreviewSource) {
	if (isHeicSource(source)) return true;
	if (!source.url) return false;

	return !getFileExtension(source.url);
}

export async function createImagePreviewUrl(
	source: ImagePreviewSource,
): Promise<string> {
	if (source.file && !isHeicSource(source)) {
		return URL.createObjectURL(source.file);
	}

	if (source.url && !isHeicSource(source)) {
		const extension = getFileExtension(source.url);
		if (extension) return source.url;
		const blob = await resolvePreviewBlob(source);
		if (!isHeicMimeType(blob.type)) {
			return URL.createObjectURL(blob);
		}

		return convertHeicBlobToUrl(blob);
	}

	const blob = await resolvePreviewBlob(source);
	return convertHeicBlobToUrl(blob);
}

async function resolvePreviewBlob(source: ImagePreviewSource) {
	if (source.file) return source.file;
	if (!source.url) {
		throw new Error("Missing image source for preview.");
	}

	const response = await fetch(source.url);
	if (!response.ok) {
		throw new Error(`Failed to fetch image preview: ${response.status}`);
	}

	return response.blob();
}

function getFileExtension(value?: string) {
	if (!value) return null;
	const cleanValue = value.split("?")[0] ?? value;
	const lastSegment = cleanValue.split("/").pop() ?? cleanValue;
	if (!lastSegment.includes(".")) return null;
	return lastSegment.split(".").pop()?.toLowerCase() ?? null;
}

async function convertHeicBlobToUrl(blob: Blob) {
	const { default: heic2any } = await import("heic2any");
	const converted = await heic2any({
		blob,
		toType: "image/jpeg",
		quality: 0.92,
	});
	const previewBlob = Array.isArray(converted) ? converted[0] : converted;

	return URL.createObjectURL(previewBlob);
}
