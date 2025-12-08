import {
	apiBoardSeek,
	boardGameAbort,
	boardGameDraw,
	boardGameResign,
	boardGameTakeback,
} from "../../../generated/client/board";
import { challengeAi } from "../../../generated/client/challenges";
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

	const response = await challengeAi(body, createAuthHeaders());

	if (response.status === 201 && "id" in response.data && response.data.id) {
		return { gameId: String(response.data.id) };
	}
	throw new Error("Failed to create game");
}

export async function resignGame(gameId: string) {
	const response = await boardGameResign(gameId, createAuthHeaders());
	if (response.status !== 200) {
		throw new Error("Resign failed");
	}
	return response.data;
}

export async function abortGame(gameId: string) {
	const response = await boardGameAbort(gameId, createAuthHeaders());
	if (response.status !== 200) {
		throw new Error("Abort failed");
	}
	return response.data;
}

export async function offerDraw(gameId: string, accept: boolean = false) {
	// todo: change "yes" : "yes"
	const response = await boardGameDraw(gameId, accept ? "yes" : "yes", createAuthHeaders());
	if (response.status !== 200) {
		throw new Error("Draw action failed");
	}
	return response.data;
}

export async function requestTakeback(gameId: string, accept: boolean = false) {
	// todo: change "yes" : "yes"
	const response = await boardGameTakeback(gameId, accept ? "yes" : "yes", createAuthHeaders());
	if (response.status !== 200) {
		throw new Error("Takeback action failed");
	}
	return response.data;
}

export async function handleRematch(gameId: string): Promise<{ gameId: string }> {
	// TODO:
	console.log("Rematch requested for game:", gameId);
	throw new Error("Rematch not yet implemented");
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

	const response = await apiBoardSeek(body, createAuthHeaders());

	if (response.status !== 200) {
		throw new Error("Failed to create seek");
	}
}
