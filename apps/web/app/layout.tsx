import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import "./globals.css";
import "cropperjs/dist/cropper.css";
import { config } from "@repo/config";

export const metadata: Metadata = {
	title: {
		absolute: config.appName,
		default: config.appName,
		template: `%s | ${config.appName}`,
	},
	icons: {
		icon: [
			{
				url: "/images/icon.svg",
				type: "image/svg+xml",
			},
		],
	},
};

export default function RootLayout({ children }: PropsWithChildren) {
	return children;
}
