import { boardGameAbort, boardGameDraw, boardGameResign } from "../../generated/client/board";
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
	alert("Failed to create game");
	throw new Error("Failed to create game");
}

export async function resignGame(gameId: string) {
	const response = await boardGameResign(gameId, createAuthHeaders());
	if (response.status !== 200) {
		alert("Resign failed");
		throw new Error("Resign failed");
	}
	return response.data;
}

export async function abortGame(gameId: string) {
	const response = await boardGameAbort(gameId, createAuthHeaders());
	if (response.status !== 200) {
		alert("Abort failed");
		throw new Error("Abort failed");
	}
	return response.data;
}

export async function offerDraw(gameId: string) {
	const response = await boardGameDraw(gameId, "yes", createAuthHeaders());
	if (response.status !== 200) {
		alert("Draw offer failed");
		throw new Error("Draw offer failed");
	}
	return response.data;
}
