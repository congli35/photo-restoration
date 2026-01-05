import { cn } from "@ui/lib";
import Image from "next/image";
import icon from "../../../public/images/icon.svg";

export function Logo({
	withLabel = true,
	className,
}: {
	className?: string;
	withLabel?: boolean;
}) {
	return (
		<span
			className={cn(
				"flex items-center font-semibold text-foreground leading-none",
				className,
			)}
		>
			<Image src={icon} alt="acme logo" className="size-10" />
			{withLabel && (
				<span
					className="ml-3 hidden text-lg font-bold leading-[1.05] tracking-[-0.02em] md:block"
					style={{ fontFamily: "var(--font-display)" }}
				>
					PhotoRestore
				</span>
			)}
		</span>
	);
}
