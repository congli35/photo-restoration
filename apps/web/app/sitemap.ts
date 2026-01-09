import { getAllPosts } from "@marketing/blog/utils/lib/posts";
import { config } from "@repo/config";
import { getBaseUrl } from "@repo/utils";
import { allLegalPages } from "content-collections";
import type { MetadataRoute } from "next";
import { docsSource } from "./docs-source";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = getBaseUrl();
	const isI18nEnabled = config.i18n.enabled;
	const locales = isI18nEnabled
		? Object.keys(config.i18n.locales)
		: [config.i18n.defaultLocale];
	const staticMarketingPages = [""];
	const posts = await getAllPosts();
	const legalPages = isI18nEnabled
		? allLegalPages
		: allLegalPages.filter(
				(page) => page.locale === config.i18n.defaultLocale,
			);
	const docsLocales = isI18nEnabled
		? docsSource.getLanguages().map((locale) => locale.language)
		: [config.i18n.defaultLocale];

	return [
		...staticMarketingPages.flatMap((page) =>
			locales.map((locale) => ({
				url: new URL(
					getMarketingPath(locale, page, isI18nEnabled),
					baseUrl,
				).href,
				lastModified: new Date(),
			})),
		),
		...legalPages.map((page) => ({
			url: new URL(
				getLegalPath(page.locale, page.path, isI18nEnabled),
				baseUrl,
			).href,
			lastModified: new Date(),
		})),
		...docsLocales.flatMap((locale) =>
			docsSource.getPages(locale).map((page) => ({
				url: new URL(
					getDocsPath(locale, page.slugs, isI18nEnabled),
					baseUrl,
				).href,
				lastModified: new Date(),
			})),
		),
	];
}

function getMarketingPath(
	locale: string,
	page: string,
	isI18nEnabled: boolean,
) {
	if (!isI18nEnabled) return page === "" ? "/" : page;

	return `/${locale}${page}`;
}

function getLegalPath(locale: string, path: string, isI18nEnabled: boolean) {
	const fullPath = `/legal/${path}`;

	if (!isI18nEnabled) return fullPath;

	return `/${locale}${fullPath}`;
}

function getDocsPath(locale: string, slugs: string[], isI18nEnabled: boolean) {
	const fullPath = `/docs/${slugs.join("/")}`;

	if (!isI18nEnabled) return fullPath;

	return `/${locale}${fullPath}`;
}
