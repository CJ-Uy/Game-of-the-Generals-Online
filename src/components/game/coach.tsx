"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { COACH_LEVEL_KEY, coachMessage, type CoachInput, type CoachLevel, type CoachTone } from "@/lib/coach";
import { IconHelp, IconInfo, IconTarget } from "@/components/ui/icons";

/**
 * One line of advice at a time, in a band that never covers the board and
 * never demands a dismissal. New players get the full commentary; the level
 * steps down to hints-only and then off, and the choice persists.
 */

export function useCoachLevel(initial: CoachLevel = "full") {
	const [level, setLevel] = useState<CoachLevel>(initial);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		try {
			const stored = window.localStorage.getItem(COACH_LEVEL_KEY);
			if (stored === "full" || stored === "hints" || stored === "off") setLevel(stored);
		} catch {
			// Private mode or blocked storage — the default is fine.
		}
		setLoaded(true);
	}, []);

	const update = useCallback((next: CoachLevel) => {
		setLevel(next);
		try {
			window.localStorage.setItem(COACH_LEVEL_KEY, next);
		} catch {
			// Non-fatal: the setting just will not survive a reload.
		}
	}, []);

	return { level, setLevel: update, loaded };
}

const TONE_ICON: Record<CoachTone, typeof IconInfo> = {
	neutral: IconInfo,
	warn: IconTarget,
	good: IconInfo,
	arbiter: IconTarget,
};

const TONE_COLOR: Record<CoachTone, string> = {
	neutral: "text-[var(--ink-muted)]",
	warn: "text-[var(--warn)]",
	good: "text-[var(--live)]",
	arbiter: "text-[var(--accent)]",
};

const NEXT_LEVEL: Record<CoachLevel, CoachLevel> = { full: "hints", hints: "off", off: "full" };
const LEVEL_LABEL: Record<CoachLevel, string> = { full: "Guide on", hints: "Hints only", off: "Guide off" };

export function CoachLine({
	input,
	onChangeLevel,
	className,
}: {
	input: CoachInput;
	onChangeLevel?: (next: CoachLevel) => void;
	className?: string;
}) {
	const message = coachMessage(input);
	const ToneIcon = message ? TONE_ICON[message.tone] : IconHelp;

	return (
		<div
			className={cn(
				"flex min-h-[2.75rem] items-center gap-2.5 border-y border-[var(--line)] bg-[var(--panel)] px-3 py-2",
				className,
			)}
		>
			<ToneIcon size={15} className={cn("mt-px flex-none", message ? TONE_COLOR[message.tone] : "text-[var(--ink-faint)]")} />

			<p key={message?.id ?? "silent"} aria-live="polite" className="gog-say min-w-0 flex-1 text-[13px] leading-snug text-[var(--foreground)]/90">
				{message?.text ?? <span className="text-[var(--ink-faint)]">Guide is off. Turn it back on any time.</span>}
			</p>

			{onChangeLevel ? (
				<button
					type="button"
					onClick={() => onChangeLevel(NEXT_LEVEL[input.level])}
					className="flex-none rounded-[3px] border border-[var(--line-strong)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-muted)] transition-colors hover:border-[var(--ink-muted)] hover:text-[var(--foreground)]"
					title={`Switch to ${LEVEL_LABEL[NEXT_LEVEL[input.level]].toLowerCase()}`}
				>
					{LEVEL_LABEL[input.level]}
				</button>
			) : null}
		</div>
	);
}
