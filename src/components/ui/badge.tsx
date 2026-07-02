import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			className={cn(
				"inline-flex w-fit items-center rounded-[3px] border border-[#1c2740] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a93a8]",
				className,
			)}
			{...props}
		/>
	);
}
