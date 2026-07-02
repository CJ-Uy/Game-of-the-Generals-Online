import { GameRoom } from "@/components/play/game-room";

export default async function GamePage({ params }: { params: Promise<{ game_id: string }> }) {
	const { game_id } = await params;
	return <GameRoom gameId={game_id.slice(0, 24)} />;
}
