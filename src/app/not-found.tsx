import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Piece } from "@/components/game/piece";

export default function NotFound() {
	return (
		<main className="flex min-h-[100dvh] flex-col bg-[var(--background)] text-[var(--foreground)]">
			<AppHeader />

			<div className="flex flex-1 items-center px-5 py-16">
				<div className="mx-auto w-full max-w-lg">
					{/* A blank enemy plate: the one thing on this site you are never allowed to see. */}
					<div className="flex items-center gap-2" aria-hidden>
						<Piece side="foe" scale="tray" />
						<Piece side="foe" scale="tray" />
						<Piece side="foe" scale="tray" />
					</div>

					<h1 className="mt-6 font-display text-[clamp(40px,9vw,76px)] font-extrabold uppercase leading-[0.9]">
						Nothing on this square
					</h1>
					<p className="mt-4 text-[16px] leading-8 text-[var(--ink-muted)]">
						That page does not exist. If you were opening a room, the code may have expired — rooms disappear once
						both players leave.
					</p>

					<div className="mt-8 flex flex-wrap gap-3">
						<Button size="lg" asChild>
							<Link href="/play">Start a match</Link>
						</Button>
						<Button variant="outline" size="lg" asChild>
							<Link href="/how-to-play">How to play</Link>
						</Button>
						<Button variant="ghost" size="lg" asChild>
							<Link href="/">Home</Link>
						</Button>
					</div>
				</div>
			</div>
		</main>
	);
}
