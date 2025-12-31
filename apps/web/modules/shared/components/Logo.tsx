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
				<span className="ml-3 hidden text-lg md:block">
					PhotoRestore
				</span>
			)}
		</span>
	);
}
