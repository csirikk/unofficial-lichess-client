import { boardGameAbort, boardGameDraw, boardGameResign } from "../../generated/client/board";
import { challengeAi } from "../../generated/client/challenges";
import { createAuthHeaders } from "../../lib/api";
import type { SetupBotLevel, SetupColorChoice } from "./logic/setup";

// gameActions.ts
export async function startBotGame(
	level: SetupBotLevel,
	clock: { limit: number; increment: number } | null = { limit: 300, increment: 3 },
	color: SetupColorChoice = "random",
): Promise<{ gameId: string }> {
	// Build body
	const body: Parameters<typeof challengeAi>[0] = {
		level,
		color,
	};

	// Only add clock params if we have a timed game
	if (clock && (clock.limit > 0 || clock.increment > 0)) {
		body["clock.limit"] = clock.limit;
		body["clock.increment"] = clock.increment;
	}

	const response = await challengeAi(body, createAuthHeaders());

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
