"use client";

import { useCallback, type KeyboardEvent } from "react";

/**
 * Arrow-key movement across a rendered board.
 *
 * The cells are already buttons, so they are reachable and activatable — but
 * 72 tab stops is not navigation. One cell holds the tab stop and the arrows
 * move focus from there, which is how people expect to move on a board.
 *
 * Coordinates are the *view* grid, so this works for either side without
 * caring which way the board is flipped.
 */
export function useBoardKeys(cols: number, rows: number) {
	return useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			const deltas: Record<string, [number, number]> = {
				ArrowLeft: [-1, 0],
				ArrowRight: [1, 0],
				ArrowUp: [0, -1],
				ArrowDown: [0, 1],
			};

			const delta = deltas[event.key];
			if (!delta) return;

			const origin = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[data-view-col]");
			if (!origin || !event.currentTarget.contains(origin)) return;

			const col = Number(origin.dataset.viewCol);
			const row = Number(origin.dataset.viewRow);
			if (!Number.isInteger(col) || !Number.isInteger(row)) return;

			const nextCol = Math.min(cols - 1, Math.max(0, col + delta[0]));
			const nextRow = Math.min(rows - 1, Math.max(0, row + delta[1]));
			if (nextCol === col && nextRow === row) return;

			const next = event.currentTarget.querySelector<HTMLElement>(`[data-view-col="${nextCol}"][data-view-row="${nextRow}"]`);
			if (!next) return;

			// Only swallow the scroll once we know we can actually move.
			event.preventDefault();
			next.focus();
		},
		[cols, rows],
	);
}
