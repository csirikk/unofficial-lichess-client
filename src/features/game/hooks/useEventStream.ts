import { useEffect, useRef } from "react";
import { apiStreamEvent } from "../../../generated/client/board";
import { gamePgn } from "../../../generated/client/games";
import type { ApiStreamEvent200 } from "../../../generated/types/apiStreamEvent200";
import type { GameFinishEvent } from "../../../generated/types/gameFinishEvent";
import type { GameJson } from "../../../generated/types/gameJson";
import type { GameStartEvent } from "../../../generated/types/gameStartEvent";
import { createStreamHeaders } from "../../../lib/api";
import { readNdjsonStream, type StreamControl } from "../../../lib/stream";

type UseEventStreamConfig = {
	enabled: boolean;
	onGameStart?: (event: GameStartEvent) => void;
	onGameFinish?: (
		event: GameFinishEvent,
		ratingDelta: { white: number | null; black: number | null },
		gameJson?: GameJson | null,
	) => void;
};

export function useEventStream({ enabled, onGameStart, onGameFinish }: UseEventStreamConfig) {
	const streamRef = useRef<StreamControl | null>(null);

	const onGameStartRef = useRef(onGameStart);
	const onGameFinishRef = useRef(onGameFinish);

	useEffect(() => {
		onGameStartRef.current = onGameStart;
	}, [onGameStart]);
	useEffect(() => {
		onGameFinishRef.current = onGameFinish;
	}, [onGameFinish]);

	useEffect(() => {
		if (!enabled || streamRef.current) return;

		const controller = new AbortController();

		const connect = async () => {
			try {
				const response = await apiStreamEvent({
					...createStreamHeaders(),
					signal: controller.signal,
				});

				if (response.status !== 200 || !response.stream.body) {
					console.error("Event stream failed", response.status);
					return;
				}

				const control = readNdjsonStream<ApiStreamEvent200>(
					"event-stream",
					response.stream,
					(event) => {
						if (event.type === "gameStart") {
							onGameStartRef.current?.(event);
						} else if (event.type === "gameFinish") {
							const gameId = event.game?.gameId || event.game?.id;
							if (gameId) {
								void (async () => {
									try {
										const response = await gamePgn(
											gameId,
											{
												pgnInJson: true,
												tags: true,
												clocks: false,
												moves: false,
												evals: false,
												opening: true,
												accuracy: false,
												division: false,
												literate: false,
											},
											{ headers: { Accept: "application/json" } },
										);

										console.log(response);

										if (response.status === 200 && "data" in response) {
											const gameJson = response.data as GameJson;
											const ratingDelta = {
												white: gameJson.players?.white?.ratingDiff ?? null,
												black: gameJson.players?.black?.ratingDiff ?? null,
											};
											onGameFinishRef.current?.(event, ratingDelta, gameJson);
										} else {
											onGameFinishRef.current?.(event, { white: null, black: null }, null);
										}
									} catch (error) {
										console.error("Failed to fetch rating delta:", error);
										onGameFinishRef.current?.(event, { white: null, black: null }, null);
									}
								})();
							} else {
								onGameFinishRef.current?.(event, { white: null, black: null }, null);
							}
						}
					},
				);

				streamRef.current = control;
				try {
					await control.closePromise;
				} catch (error) {
					if (
						error instanceof DOMException
							? error.name === "AbortError"
							: (error as Error | undefined)?.name === "AbortError"
					) {
						return;
					}
					console.error("Event stream error", error);
				}
			} catch (error) {
				if ((error as Error).name === "AbortError") return;
				console.error("Event stream error", error);
			} finally {
				streamRef.current = null;
			}
		};

		void connect().catch((err) => {
			console.error("Unhandled error in event stream connect:", err);
		});

		return () => {
			try {
				controller.abort();
			} catch {}
			streamRef.current?.close();
			streamRef.current = null;
		};
	}, [enabled]);
}
