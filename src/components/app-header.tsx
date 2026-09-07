import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One header across every in-app surface. Gold appears here only in the mark,
 * because the mark is the army's colour; the links stay ink so nothing on the
 * page competes with the board.
 */
export function AppHeader({ children, className }: { children?: ReactNode; className?: string }) {
	return (
		<header
			className={cn(
				"sticky top-0 z-50 flex h-[56px] flex-none items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--background)]/92 px-4 backdrop-blur md:px-6",
				className,
			)}
		>
			<Link href="/" className="flex min-w-0 items-center gap-2.5 text-[var(--foreground)]">
				<Mark />
				<span className="truncate font-display text-lg font-semibold uppercase leading-none tracking-[0.06em]">
					<span className="md:hidden">GoG Online</span>
					<span className="hidden md:inline">Game of the Generals</span>
				</span>
			</Link>
			<div className="flex flex-none items-center gap-1.5">{children}</div>
		</header>
	);
}

function Mark() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="flex-none text-[var(--accent)]">
			<path d="M12 2.6l2.7 5.9 6.4.7-4.8 4.3 1.3 6.3L12 16.7 6.4 19.8l1.3-6.3L2.9 9.2l6.4-.7Z" fill="currentColor" />
		</svg>
	);
}
