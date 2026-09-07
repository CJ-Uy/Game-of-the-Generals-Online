"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconClose } from "@/components/ui/icons";

/**
 * Built on the native <dialog>, which already gives us the focus trap, the
 * inert background, Escape-to-close and the backdrop. No library, no
 * hand-rolled key handling.
 *
 * Presents as a bottom sheet on phones and a centred panel from `sm` up.
 */
export function Sheet({
	open,
	onClose,
	title,
	description,
	children,
	footer,
	size = "md",
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children: ReactNode;
	footer?: ReactNode;
	size?: "sm" | "md" | "lg";
}) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [open]);

	return (
		<dialog
			ref={ref}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
			onClick={(event) => {
				// Clicking the backdrop — i.e. the dialog element itself — dismisses.
				if (event.target === ref.current) onClose();
			}}
			aria-label={title}
			className={cn(
				"m-0 w-full max-w-none bg-transparent p-0 text-[var(--foreground)] backdrop:bg-[#05080e]/78",
				"mt-auto max-h-[92dvh] sm:m-auto sm:max-h-[86dvh]",
				size === "sm" && "sm:max-w-md",
				size === "md" && "sm:max-w-xl",
				size === "lg" && "sm:max-w-3xl",
			)}
		>
			{open ? (
				<div className="gog-sheet-in flex max-h-[92dvh] flex-col border-t border-[var(--line-strong)] bg-[var(--panel-raised)] shadow-[var(--e3)] sm:max-h-[86dvh] sm:border">
					<header className="flex flex-none items-start gap-4 border-b border-[var(--line)] px-5 py-4">
						<div className="min-w-0 flex-1">
							<h2 className="font-display text-2xl font-semibold uppercase leading-none tracking-wide">{title}</h2>
							{description ? <p className="mt-1.5 text-sm text-[var(--ink-muted)]">{description}</p> : null}
						</div>
						<button
							type="button"
							onClick={onClose}
							aria-label="Close"
							className="-mr-1.5 -mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-[4px] text-[var(--ink-muted)] transition-colors hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
						>
							<IconClose size={18} />
						</button>
					</header>

					<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

					{footer ? <footer className="flex-none border-t border-[var(--line)] px-5 py-3.5">{footer}</footer> : null}
				</div>
			) : null}
		</dialog>
	);
}
