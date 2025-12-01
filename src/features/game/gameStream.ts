import { useCallback, useEffect, useRef, useState } from "react";
import { boardGameMove, boardGameStream } from "../../generated/client/board";
import type { BoardGameStream200 } from "../../generated/types/boardGameStream200";
import type { GameFullEvent } from "../../generated/types/gameFullEvent";
import type { GameStateEvent } from "../../generated/types/gameStateEvent";
import { GameStatusName } from "../../generated/types/gameStatusName";
import { createAuthHeaders, createStreamHeaders } from "../../libs/api";
import { readNdjsonStream, type StreamControl } from "../../libs/ndjson";

export function gameStream(gameId: string | null) {
	const [gameFull, setGameFull] = useState<GameFullEvent | null>(null);
	const [gameState, setGameState] = useState<GameStateEvent | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [streamNotFound, setStreamNotFound] = useState(false);
	const [isConnected, setIsConnected] = useState(false);

	const streamControlRef = useRef<StreamControl | null>(null);

	// connect to game NDJSON stream on gameId changes
	useEffect(() => {
		if (!gameId) return;

		setGameFull(null);
		setGameState(null);

		let mounted = true;
		const abort = new AbortController();
		setIsConnected(false);
		setError(null);
		setStreamNotFound(false);

		(async () => {
			try {
				// TODO: fix fails when bullet bot game
				// GET /api/board/game/stream/${gameId}
				const response = await boardGameStream(gameId, {
					...createStreamHeaders(),
					signal: abort.signal,
				});

				if (!mounted) return;
				if (response.status !== 200) {
					if (response.status === 404) {
						setStreamNotFound(true);
					}
					alert(`Failed to stream game: ${response.status}`);
					throw new Error(`Failed to stream game: ${response.status}`);
				}

				setIsConnected(true);

				const control = readNdjsonStream<BoardGameStream200>(
					`game-${gameId}`,
					response.stream,
					(gameEvent) => {
						if (!mounted || !gameEvent || typeof gameEvent !== "object" || !("type" in gameEvent))
							return;

						if (gameEvent.type === "gameFull") {
							const full = gameEvent as GameFullEvent;
							setGameFull(full);
							setGameState(full.state);
							if (full.state.status !== GameStatusName.started) {
								control.close();
							}
						} else if (gameEvent.type === "gameState") {
							const state = gameEvent as GameStateEvent;
							setGameFull((prev) => (prev ? { ...prev, state } : prev));
							setGameState(state);
							if (state.status !== GameStatusName.started) {
								control.close();
							}
						}
					},
				);

				streamControlRef.current = control;
				await control.closePromise;
			} catch (error) {
				if (
					(error instanceof DOMException && error.name === "AbortError") ||
					(error instanceof Error && error.name === "AbortError")
				) {
					return;
				}

				if (mounted) {
					setError(error instanceof Error ? error.message : "Stream error");
				}
			} finally {
				if (mounted) {
					setIsConnected(false);
				}
			}
		})();

		return () => {
			mounted = false;
			abort.abort();
			streamControlRef.current?.close();
			streamControlRef.current = null;
			setIsConnected(false);
		};
	}, [gameId]);

	const makeMove = useCallback(
		async (uci: string) => {
			if (!gameId) throw new Error("No game ID");
			// POST /api/board/game/{gameId}/move/{move}
			const response = await boardGameMove(gameId, uci, undefined, createAuthHeaders());
			if (response.status !== 200) throw new Error("Move failed");
			return response.data;
		},
		[gameId],
	);

	return {
		gameFull,
		gameState,
		error,
		isConnected,
		streamNotFound,
		makeMove,
	};
}
