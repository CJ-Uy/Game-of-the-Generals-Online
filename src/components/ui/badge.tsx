import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			className={cn(
				"inline-flex w-fit items-center rounded-[3px] border border-[var(--line)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]",
				className,
			)}
			{...props}
		/>
	);
}
