"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { IconCheck, IconCopy, IconResign, IconShare } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { CoachLevel } from "@/lib/coach";

/**
 * Match controls.
 *
 * Resign used to live at the bottom of the chat panel, which is both hard to
 * find and easy to hit by accident. It belongs here, one deliberate tap away,
 * behind a confirmation that says what it costs rather than asking "are you
 * sure" — a player should never lose a match to a mis-tap or to vagueness.
 *
 * Two steps in one sheet rather than a nested dialog: nesting native <dialog>
 * elements fights the top layer and the focus trap.
 */

const LEVELS: { value: CoachLevel; label: string; note: string }[] = [
	{ value: "full", label: "Full guide", note: "Explains each piece and every fight." },
	{ value: "hints", label: "Hints only", note: "Speaks up for fights and selected pieces." },
	{ value: "off", label: "Off", note: "No commentary at all." },
];

export function MatchMenu({
	open,
	onClose,
	onResign,
	canResign,
	coachLevel,
	onCoachLevel,
	roomCode,
	onCopyCode,
	onShareInvite,
	codeCopied,
}: {
	open: boolean;
	onClose: () => void;
	onResign?: () => void;
	canResign?: boolean;
	coachLevel: CoachLevel;
	onCoachLevel: (level: CoachLevel) => void;
	roomCode?: string;
	onCopyCode?: () => void;
	onShareInvite?: () => void;
	codeCopied?: boolean;
}) {
	const [confirming, setConfirming] = useState(false);

	// Never leave the sheet parked on the confirmation step.
	useEffect(() => {
		if (!open) setConfirming(false);
	}, [open]);

	if (confirming) {
		return (
			<Sheet
				open={open}
				onClose={onClose}
				title="Resign this match?"
				size="sm"
				footer={
					<div className="flex flex-col gap-2 sm:flex-row-reverse">
						<Button
							className="sm:flex-1 bg-[var(--loss)] text-[var(--foreground)] hover:bg-[#bd5b45]"
							onClick={() => {
								onResign?.();
								onClose();
							}}
						>
							Resign
						</Button>
						<Button variant="outline" className="sm:flex-1" onClick={() => setConfirming(false)}>
							Keep playing
						</Button>
					</div>
				}
			>
				<ul className="space-y-2.5 text-sm text-[var(--foreground)]/90">
					<li className="flex gap-2.5">
						<span aria-hidden className="mt-2 h-1 w-1 flex-none rounded-full bg-[var(--loss)]" />
						Your opponent wins immediately.
					</li>
					<li className="flex gap-2.5">
						<span aria-hidden className="mt-2 h-1 w-1 flex-none rounded-full bg-[var(--loss)]" />
						Both armies are revealed — they will see every rank you hid.
					</li>
					<li className="flex gap-2.5">
						<span aria-hidden className="mt-2 h-1 w-1 flex-none rounded-full bg-[var(--loss)]" />
						The match ends here. This cannot be undone.
					</li>
				</ul>
			</Sheet>
		);
	}

	return (
		<Sheet open={open} onClose={onClose} title="Match" size="sm">
			<div className="space-y-6">
				{roomCode ? (
					<section>
						<h3 className="font-display text-lg font-semibold uppercase tracking-wide">Room code</h3>
						<button
							type="button"
							onClick={onCopyCode}
							className="mt-2 flex w-full items-center justify-between gap-3 border border-[var(--line-strong)] bg-[var(--panel)] px-4 py-3 transition-colors hover:border-[var(--ink-muted)]"
						>
							<span className="font-mono text-2xl font-semibold tracking-[0.24em]">{roomCode}</span>
							<span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
								{codeCopied ? (
									<>
										<IconCheck size={14} className="text-[var(--live)]" />
										Copied
									</>
								) : (
									<>
										<IconCopy size={14} />
										Copy
									</>
								)}
							</span>
						</button>
						{onShareInvite ? (
							<Button variant="outline" size="sm" className="mt-2 w-full" onClick={onShareInvite}>
								<IconShare size={15} />
								<span className="ml-2">Send an invite link</span>
							</Button>
						) : null}
					</section>
				) : null}

				<section>
					<h3 className="font-display text-lg font-semibold uppercase tracking-wide">Guide</h3>
					<p className="mt-1 text-xs text-[var(--ink-muted)]">How much the arbiter explains while you play.</p>
					<div className="mt-2.5 space-y-1.5">
						{LEVELS.map((level) => (
							<button
								key={level.value}
								type="button"
								onClick={() => onCoachLevel(level.value)}
								aria-pressed={coachLevel === level.value}
								className={cn(
									"flex w-full items-start gap-3 border px-3 py-2.5 text-left transition-colors",
									coachLevel === level.value
										? "border-[var(--accent)] bg-[var(--accent)]/10"
										: "border-[var(--line-strong)] bg-[var(--panel)] hover:border-[var(--ink-muted)]",
								)}
							>
								<span className="min-w-0 flex-1">
									<span className="block text-sm font-medium">{level.label}</span>
									<span className="block text-xs text-[var(--ink-muted)]">{level.note}</span>
								</span>
								{coachLevel === level.value ? <IconCheck size={16} className="mt-0.5 flex-none text-[var(--accent)]" /> : null}
							</button>
						))}
					</div>
				</section>

				{onResign ? (
					<section>
						<h3 className="font-display text-lg font-semibold uppercase tracking-wide">Leave</h3>
						<Button
							variant="outline"
							className="mt-2 w-full justify-start border-[var(--loss)]/45 text-[#e0a08c] hover:border-[var(--loss)] hover:bg-[var(--loss)]/10"
							disabled={!canResign}
							onClick={() => setConfirming(true)}
						>
							<IconResign size={16} />
							<span className="ml-2">Resign the match</span>
						</Button>
						{!canResign ? <p className="mt-1.5 text-xs text-[var(--ink-faint)]">This match is already over.</p> : null}
					</section>
				) : null}
			</div>
		</Sheet>
	);
}
