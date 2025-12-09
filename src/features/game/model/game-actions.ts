import {
	apiBoardSeek,
	boardGameAbort,
	boardGameDraw,
	boardGameResign,
	boardGameTakeback,
} from "../../../generated/client/board";
import { challengeAi, challengeCreate } from "../../../generated/client/challenges";
import type { GameFullEvent } from "../../../generated/types/gameFullEvent";
import { createAuthHeaders } from "../../../lib/api";
import type { GameSetup, SetupBotLevel, SetupColorChoice } from "./setup";
import { findTimePreset } from "./setup";

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

	// API: POST https://lichess.org/api/challenge/ai - Challenge AI to a game
	const response = await challengeAi(body, createAuthHeaders());

	if (response.status === 201 && "id" in response.data && response.data.id) {
		return { gameId: String(response.data.id) };
	}
	throw new Error("Failed to create game");
}

export async function resignGame(gameId: string) {
	// API: POST https://lichess.org/api/board/game/{gameId}/resign
	const response = await boardGameResign(gameId, createAuthHeaders());
	if (response.status !== 200) {
		throw new Error("Resign failed");
	}
	return response.data;
}

export async function abortGame(gameId: string) {
	// API: POST https://lichess.org/api/board/game/{gameId}/abort
	const response = await boardGameAbort(gameId, createAuthHeaders());
	if (response.status !== 200) {
		throw new Error("Abort failed");
	}
	return response.data;
}

export async function offerDraw(gameId: string, accept: boolean = false) {
	// API: POST https://lichess.org/api/board/game/{gameId}/draw/{accept} - Create/accept/decline draw offers
	const response = await boardGameDraw(gameId, accept, createAuthHeaders());
	if (response.status !== 200) {
		throw new Error("Draw action failed");
	}
	return response.data;
}

export async function requestTakeback(gameId: string, accept: boolean = false) {
	// API: POST https://lichess.org/api/board/game/{gameId}/takeback/{accept} - Create/accept/decline takeback offers
	const response = await boardGameTakeback(gameId, accept, createAuthHeaders());
	if (response.status !== 200) {
		throw new Error("Takeback action failed");
	}
	return response.data;
}

export async function handleRematch(
	gameFull: GameFullEvent,
	myColor: "white" | "black" | null,
): Promise<{ gameId: string } | { success: true }> {
	if (!myColor) {
		throw new Error("Cannot rematch: player color unknown");
	}

	const opponent = myColor === "white" ? gameFull.black : gameFull.white;

	if (opponent.aiLevel != null) {
		const body: Parameters<typeof challengeAi>[0] = {
			level: opponent.aiLevel,
			color: "random",
		};

		if (gameFull.clock?.initial != null && gameFull.clock?.increment != null) {
			body["clock.limit"] = gameFull.clock.initial / 1000;
			body["clock.increment"] = gameFull.clock.increment / 1000;
		}

		// API: POST https://lichess.org/api/challenge/ai - Challenge AI to a game
		const response = await challengeAi(body, createAuthHeaders());

		if (response.status === 201 && "id" in response.data && response.data.id) {
			return { gameId: String(response.data.id) };
		}
		throw new Error("Failed to create AI rematch");
	}

	// Rematch against human
	const body: Parameters<typeof challengeCreate>[1] = {
		rated: gameFull.rated,
		color: "random",
		variant: gameFull.variant.key,
	};

	// Add clock settings if game was timed
	if (gameFull.clock?.initial != null && gameFull.clock?.increment != null) {
		body["clock.limit"] = gameFull.clock.initial / 1000;
		body["clock.increment"] = gameFull.clock.increment / 1000;
	} else if (gameFull.daysPerTurn) {
		body.days = gameFull.daysPerTurn;
	}

	// API: POST https://lichess.org/api/challenge/{username} - Challenge a player
	const response = await challengeCreate(opponent.id, body, createAuthHeaders());

	if (response.status === 200 && "challenge" in response.data) {
		return { success: true };
	}
	throw new Error(`Failed to create rematch challenge: ${response.status}`);
}

export async function startOnlineSeek(setup: GameSetup): Promise<void> {
	const preset = findTimePreset(setup.timePresetId);
	if (!preset) {
		throw new Error("Invalid time preset");
	}

	const body = {
		time: preset.limitSeconds / 60,
		increment: preset.incrementSeconds,
		rated: setup.rated,
		variant: "standard" as const,
		color: setup.colorChoice,
	};

	// API: POST https://lichess.org/api/board/seek - Create a public seek to start a game with a random player
	const response = await apiBoardSeek(body, createAuthHeaders());

	if (response.status !== 200) {
		throw new Error("Failed to create seek");
	}
}
