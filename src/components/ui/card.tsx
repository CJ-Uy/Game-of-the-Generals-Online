import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("rounded-[8px] border border-[var(--line)] bg-[var(--panel-raised)]", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("flex flex-col gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("font-display text-2xl font-bold uppercase leading-none", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("text-sm leading-7 text-[var(--ink-muted)]", className)} {...props} />;
}
