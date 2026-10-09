import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[3px] text-xs font-semibold uppercase tracking-[0.12em] transition-colors active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default: "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--gold-hi)]",
				// Secondary actions stay ink on hover: gold is reserved for the one primary action.
				// The fill is near-opaque so an outline button stays legible over the live board.
				outline:
					"border border-[#4a5878] bg-[var(--background)]/85 text-[#c7cbd6] hover:border-[var(--ink-muted)] hover:bg-[var(--panel-raised)] hover:text-[var(--foreground)]",
				ghost: "text-[var(--ink-muted)] hover:bg-[var(--panel-raised)]/60 hover:text-[var(--foreground)]",
			},
			size: {
				default: "h-11 px-5",
				lg: "h-13 px-7",
				// Small on a mouse, but never under 40px on a touch screen.
				sm: "h-9 px-4 text-[11px] pointer-coarse:h-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export function Button({
	className,
	variant,
	size,
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot : "button";

	return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
