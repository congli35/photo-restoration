import type { Messages } from "@repo/i18n";
import type { JSX as Jsx } from "react/jsx-runtime";

// temporary fix for mdx types
// TODO: remove once mdx has fully compatibility with react 19
declare global {
	namespace JSX {
		type ElementClass = Jsx.ElementClass;
		type Element = Jsx.Element;
		type IntrinsicElements = Jsx.IntrinsicElements;
	}
}

declare global {
	interface IntlMessages extends Messages {}
}

declare module "heic2any" {
	interface Heic2AnyOptions {
		blob: Blob;
		toType?: string;
		quality?: number;
	}

	type Heic2AnyResult = Blob | Blob[];

	function heic2any(options: Heic2AnyOptions): Promise<Heic2AnyResult>;

	export default heic2any;
}
