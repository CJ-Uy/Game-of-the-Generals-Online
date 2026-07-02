import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[3px] text-xs font-semibold uppercase tracking-[0.12em] transition-colors active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default: "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[#dabb74]",
				outline:
					"border border-[#4a5878] bg-[#0e1420]/50 text-[#c7cbd6] hover:border-[var(--accent)] hover:text-[var(--accent)]",
				ghost: "text-[#8a93a8] hover:text-[#ede8da]",
			},
			size: {
				default: "h-11 px-5",
				lg: "h-13 px-7",
				sm: "h-9 px-4 text-[11px]",
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
