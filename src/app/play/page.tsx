import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardSetup } from "@/components/play/board-setup";

export const metadata: Metadata = {
	title: "Set up your army",
	description: "Place 21 hidden pieces, pick a formation, then play a friend, the computer, or someone on the same device.",
};

export default function PlayPage() {
	// useSearchParams (for ?join=CODE invite links) needs a boundary or the
	// whole route opts out of prerendering.
	return (
		<Suspense>
			<BoardSetup />
		</Suspense>
	);
}
