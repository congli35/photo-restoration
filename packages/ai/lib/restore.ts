import { GoogleGenAI } from "@google/genai";

export async function restoreImage(
	imageBuffer: Buffer,
	mimeType = "image/png",
	options?: RestoreImageOptions,
): Promise<Buffer> {
	const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
	const base64Image = imageBuffer.toString("base64");
	const promptText = resolvePromptText(options);

	const prompt = [
		{ text: promptText },
		{
			inlineData: {
				mimeType,
				data: base64Image,
			},
		},
	];

	const imageSize = resolveImageSize(options?.resolution);
	const response = await ai.models.generateContent({
		model: "gemini-3-pro-image-preview",
		contents: prompt,
		...(imageSize
			? {
					config: {
						responseModalities: ["TEXT", "IMAGE"],
						imageConfig: {
							imageSize,
						},
					},
				}
			: {}),
	});

	if (!response.candidates?.[0]?.content?.parts)
		throw new Error("No content generated from Gemini");

	for (const part of response.candidates[0].content.parts) {
		if (part.inlineData?.data)
			return Buffer.from(part.inlineData.data, "base64");
	}

	throw new Error("No image data found in Gemini response");
}

export function buildRestorationPrompt(variantId?: string): string {
	const variant = getRestorationVariant(variantId);
	const prompt = mergeRestorationPrompt(BASE_PROMPT, variant.overrides);

	return JSON.stringify(prompt);
}

export function getRestorationVariantId(index: number): string {
	const safeIndex = Number.isFinite(index) ? Math.abs(index) : 0;

	return RESTORATION_VARIANT_ORDER[
		safeIndex % RESTORATION_VARIANT_ORDER.length
	];
}

function resolvePromptText(promptInput?: string | RestoreImageOptions): string {
	if (!promptInput) return buildRestorationPrompt();
	if (promptInput.promptText) return promptInput.promptText;

	return buildRestorationPrompt(promptInput.variantId);
}

function getRestorationVariant(variantId?: string): RestorationVariant {
	if (variantId && RESTORATION_VARIANTS[variantId])
		return RESTORATION_VARIANTS[variantId];

	return RESTORATION_VARIANTS[DEFAULT_RESTORATION_VARIANT_ID];
}

function mergeRestorationPrompt(
	base: RestorationPrompt,
	overrides?: RestorationVariantOverrides,
): RestorationPrompt {
	if (!overrides) return base;

	return {
		task: overrides.task ?? base.task,
		language: overrides.language ?? base.language,
		prompt: mergePromptSections(base.prompt, overrides.prompt),
		negative_prompt: overrides.negative_prompt ?? base.negative_prompt,
		parameters: { ...base.parameters, ...overrides.parameters },
	};
}

function mergePromptSections(
	base: PromptSections,
	overrides?: Partial<PromptSections>,
): PromptSections {
	if (!overrides) return base;

	return {
		subject: { ...base.subject, ...overrides.subject },
		lighting: { ...base.lighting, ...overrides.lighting },
		image_quality: {
			...base.image_quality,
			...overrides.image_quality,
		},
		optics: { ...base.optics, ...overrides.optics },
		background: { ...base.background, ...overrides.background },
		color_grading: { ...base.color_grading, ...overrides.color_grading },
		style_constraints: {
			...base.style_constraints,
			...overrides.style_constraints,
		},
	};
}

const DEFAULT_RESTORATION_VARIANT_ID = "studio";
const RESTORATION_VARIANT_ORDER = ["studio", "natural", "cinematic"];

const BASE_PROMPT: RestorationPrompt = {
	task: "portrait_restoration",
	language: "zh-CN",
	prompt: {
		subject: {
			type: "human_portrait",
			identity_fidelity: "match_uploaded_face_100_percent",
			no_facial_modification: true,
			ethnicity_preservation: "detect_and_maintain_original_heritage",
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
			skin_tone: "preserve_original_melanin_levels",
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
};

const RESTORATION_VARIANTS: Record<string, RestorationVariant> = {
	studio: {
		id: "studio",
		name: "Studio Polish",
		overrides: {},
	},
	natural: {
		id: "natural",
		name: "Natural Realistic",
		overrides: {
			prompt: {
				lighting: {
					exposure: "neutral_clear",
					style: "soft_natural_light",
					specular_highlights: "subtle_natural",
				},
				optics: {
					aperture: "f/2.8",
					depth_of_field: "soft_shallow",
				},
				color_grading: {
					style: "natural_documentary",
					saturation: "natural",
				},
			},
			parameters: {
				realism_strength: 0.98,
				recommended_denoise: "low",
			},
		},
	},
	cinematic: {
		id: "cinematic",
		name: "Cinematic Mood",
		overrides: {
			prompt: {
				lighting: {
					exposure: "dramatic_contrast",
					style: "cinematic_key_light",
					shadow_transition: "pronounced",
				},
				optics: {
					lens: "50mm",
					aperture: "f/1.4",
					depth_of_field: "very_shallow",
				},
				color_grading: {
					style: "cinematic",
					saturation: "rich_but_natural",
					white_balance: "warm",
				},
			},
			parameters: {
				realism_strength: 0.92,
			},
		},
	},
};

function resolveImageSize(
	resolution?: RestoreImageOptions["resolution"],
): "1K" | "2K" | "4K" | undefined {
	switch (resolution?.toLowerCase()) {
		case "1k":
			return "1K";
		case "2k":
			return "2K";
		case "4k":
			return "4K";
		default:
			return undefined;
	}
}

interface RestoreImageOptions {
	promptText?: string;
	variantId?: string;
	resolution?: string;
}

interface RestorationPrompt {
	task: string;
	language: string;
	prompt: PromptSections;
	negative_prompt: string[];
	parameters: Record<string, string | number>;
}

interface PromptSections {
	subject: Record<string, string | number | boolean>;
	lighting: Record<string, string | number | boolean>;
	image_quality: Record<string, string | number | boolean>;
	optics: Record<string, string | number | boolean>;
	background: Record<string, string | number | boolean>;
	color_grading: Record<string, string | number | boolean>;
	style_constraints: Record<string, string | number | boolean>;
}

interface RestorationVariant {
	id: string;
	name: string;
	overrides: RestorationVariantOverrides;
}

interface RestorationVariantOverrides {
	task?: string;
	language?: string;
	prompt?: Partial<PromptSections>;
	negative_prompt?: string[];
	parameters?: Record<string, string | number>;
}
