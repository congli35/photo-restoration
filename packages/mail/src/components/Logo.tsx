import { Img } from "@react-email/components";
import React from "react";

export function Logo({ withLabel = true }: LogoProps) {
	const logoSrc = getLogoSrc();
	return (
		<span className="flex items-center font-semibold text-primary leading-none">
			<Img
				alt="Logo"
				className="h-12 w-12"
				height={48}
				src={logoSrc}
				width={48}
			/>
			{withLabel && <span className="ml-3 text-xl">acme</span>}
		</span>
	);
}

function getLogoSrc() {
	const path = "/images/icon.png";
	if (process.env.NEXT_PUBLIC_SITE_URL) {
		return `${process.env.NEXT_PUBLIC_SITE_URL}${path}`;
	}
	if (process.env.NEXT_PUBLIC_VERCEL_URL) {
		return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}${path}`;
	}
	return path;
}

interface LogoProps {
	withLabel?: boolean;
}
