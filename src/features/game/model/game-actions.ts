import {
	boardGameAbort,
	boardGameDraw,
	boardGameResign,
	boardGameTakeback,
	getApiBoardSeekUrl,
} from "../../../generated/client/board";
import { getChallengeCreateUrl } from "../../../generated/client/challenges";
import { readNdjsonStream, type StreamControl } from "../../../lib/stream";
import { challengeAi } from "../../../generated/client/challenges";
import type { GameFullEvent } from "../../../generated/types/gameFullEvent";
import type { GameColor as Color } from "../../../generated/types/gameColor";
import { createAuthHeaders } from "../../../lib/api";
import type { GameSetup, SetupBotLevel, SetupColorChoice } from "./setup";
import { MIN_RATED_MINUTES, MIN_UNRATED_MINUTES, MIN_BOT_MINUTES } from "./setup";

export async function startBotGame(
	level: SetupBotLevel,
	clock: { limit: number; increment: number } | null = { limit: 300, increment: 3 },
	color: SetupColorChoice = "random",
): Promise<{ gameId: string }> {
	// Validate clock
	if (clock && (clock.limit > 0 || clock.increment > 0)) {
		if (clock.limit < MIN_BOT_MINUTES * 60) {
			throw new Error(`Bot games must be ${MIN_BOT_MINUTES} minutes or longer.`);
		}
	}

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
	myColor: Color | null,
	options?: RequestInit,
): Promise<{ gameId: string } | { streamControl: StreamControl }> {
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
	const form = new URLSearchParams();
	form.append("rated", String(gameFull.rated));
	form.append("color", "random");
	form.append("variant", gameFull.variant.key);
	form.append("keepAliveStream", "true");

	// Add clock settings if game was timed
	if (gameFull.clock?.initial != null && gameFull.clock?.increment != null) {
		form.append("clock.limit", String(gameFull.clock.initial / 1000));
		form.append("clock.increment", String(gameFull.clock.increment / 1000));
	} else if (gameFull.daysPerTurn) {
		form.append("days", String(gameFull.daysPerTurn));
	}

	const authHeaders = createAuthHeaders("application/x-ndjson");
	const headers = new Headers(authHeaders.headers);
	headers.set("Content-Type", "application/x-www-form-urlencoded");

	// API: POST https://lichess.org/api/challenge/{username} - Challenge a player
	const response = await fetch(getChallengeCreateUrl(opponent.id), {
		method: "POST",
		headers,
		body: form,
		signal: options?.signal,
	});

	if (!response.ok) {
		const errorData = await response
			.json()
			.catch(() => ({ error: "Failed to create rematch challenge" }));
		throw new Error(errorData.error || "Failed to create rematch challenge");
	}

	const streamControl = readNdjsonStream<{ done: string }>("challenge", response, (data) => {
		if (data.done) {
			console.log(`Challenge ${data.done}:`, opponent.id);
		}
	});

	return { streamControl };
}

export async function startOnlineSeek(
	setup: GameSetup,
	options?: RequestInit,
): Promise<StreamControl> {
	const { limit, increment } = setup.timeControl;
	const limitMinutes = limit / 60;

	if (setup.rated) {
		if (limitMinutes < MIN_RATED_MINUTES) {
			throw new Error(`Rated games must be ${MIN_RATED_MINUTES} minutes or longer.`);
		}
	} else {
		if (limitMinutes < MIN_UNRATED_MINUTES) {
			throw new Error(`Unrated games must be ${MIN_UNRATED_MINUTES} minutes or longer.`);
		}
	}

	const form = new URLSearchParams();
	form.append("rated", String(setup.rated));
	form.append("variant", "standard");
	form.append("color", setup.colorChoice);
	form.append("time", parseFloat(limitMinutes.toFixed(2)).toString());
	form.append("increment", increment.toString());

	const authHeaders = createAuthHeaders("application/x-ndjson");
	const headers = new Headers(authHeaders.headers);
	headers.set("Content-Type", "application/x-www-form-urlencoded");

	// API: POST https://lichess.org/api/board/seek - Create a new seek
	const response = await fetch(getApiBoardSeekUrl(), {
		method: "POST",
		headers,
		body: form,
		signal: options?.signal,
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ error: "Failed to create seek" }));
		throw new Error(errorData.error || "Failed to create seek");
	}

	const streamControl = readNdjsonStream("seek", response, () => {});
	return streamControl;
}
