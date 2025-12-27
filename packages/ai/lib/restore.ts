import { GoogleGenAI } from "@google/genai";

const PORTRAIT_RESTORATION_PROMPT = JSON.stringify({
	task: "portrait_restoration",
	language: "zh-CN",
	prompt: {
		subject: {
			type: "human_portrait",
			identity_fidelity: "match_uploaded_face_100_percent",
			no_facial_modification: true,
			expression: "natural",
			eye_detail: "sharp_clear",
			skin_texture: "ultra_realistic",
			hair_detail: "natural_individual_strands",
			fabric_detail: "rich_high_frequency_detail",
		},
		lighting: {
			exposure: "bright_clear",
			style: "soft_studio_light",
			brightness_balance: "even",
			specular_highlights: "natural_on_face_and_eyes",
			shadow_transition: "smooth_gradual",
		},
		image_quality: {
			resolution: "8k",
			clarity: "high",
			noise: "clean_low",
			artifacts: "none",
			over_smoothing: "none",
		},
		optics: {
			camera_style: "full_frame_dslr",
			lens: "85mm",
			aperture: "f/1.8",
			depth_of_field: "soft_shallow",
			bokeh: "smooth_natural",
		},
		background: {
			style: "clean_elegant",
			distraction_free: true,
			tone: "neutral",
		},
		color_grading: {
			style: "cinematic",
			saturation: "rich_but_natural",
			white_balance: "accurate",
			skin_tone: "natural_true_to_subject",
		},
		style_constraints: {
			no_cartoon: true,
			no_beauty_filter: true,
			no_plastic_skin: true,
			no_face_reshaping: true,
			no_ai_face_swap: true,
		},
	},
	negative_prompt: [
		"cartoon",
		"anime",
		"cgi",
		"painterly",
		"plastic skin",
		"over-smoothing",
		"over-sharpening halos",
		"heavy skin retouching",
		"face reshaping",
		"identity drift",
		"face swap",
		"beauty filter",
		"uncanny",
		"washed out",
		"color cast",
		"blown highlights",
		"crushed shadows",
		"banding",
		"jpeg artifacts",
		"extra fingers",
		"deformed eyes",
		"asymmetrical face",
		"warped features",
	],
	parameters: {
		fidelity_priority: "identity",
		detail_priority: "eyes_skin_hair_fabric",
		realism_strength: 0.95,
		sharpening: "micro_contrast_only",
		skin_retention: "keep_pores_and_microtexture",
		recommended_denoise: "low_to_medium",
	},
});

/**
 * Restore an image using Google Gemini model
 * @param imageBuffer Buffer of the image to restore
 * @param mimeType Mime type of the image (default: image/png)
 * @param promptText Prompt for the restoration(default: PORTRAIT_RESTORATION_PROMPT)
 * @returns Buffer of the restored image
 */
export async function restoreImage(
	imageBuffer: Buffer,
	mimeType = "image/png",
	promptText = PORTRAIT_RESTORATION_PROMPT,
): Promise<Buffer> {
	const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

	const base64Image = imageBuffer.toString("base64");

	const prompt = [
		{ text: promptText },
		{
			inlineData: {
				mimeType,
				data: base64Image,
			},
		},
	];

	const response = await ai.models.generateContent({
		model: "gemini-3-pro-image-preview",
		contents: prompt,
	});

	if (!response.candidates?.[0]?.content?.parts) {
		throw new Error("No content generated from Gemini");
	}

	for (const part of response.candidates[0].content.parts) {
		if (part.inlineData?.data) {
			return Buffer.from(part.inlineData.data, "base64");
		}
	}

	throw new Error("No image data found in Gemini response");
}
