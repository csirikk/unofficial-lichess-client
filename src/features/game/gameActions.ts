import { challengeAi } from "../../generated/client/challenges";
import { createAuthHeaders } from "../../libs/api";

export async function startBotGame(
	level: number,
	clock: { limit: number; increment: number } = { limit: 300, increment: 3 },
): Promise<{ gameId: string }> {
	// POST /api/challenge/ai
	const response = await challengeAi(
		{ level, "clock.limit": clock.limit, "clock.increment": clock.increment },
		createAuthHeaders(),
	);

	if (response.status === 201 && "id" in response.data && response.data.id) {
		return { gameId: String(response.data.id) };
	}
	throw new Error("Failed to create game");
}
