import type { Metadata } from "next";
import { BoardSetup } from "@/components/play/board-setup";

export const metadata: Metadata = {
	title: "Set up your army",
	description: "Place 21 hidden pieces, pick a formation, then play a friend, the computer, or someone on the same device.",
};

export default function PlayPage() {
	return <BoardSetup />;
}
