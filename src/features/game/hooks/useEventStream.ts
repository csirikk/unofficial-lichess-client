import { useEffect, useRef } from "react";
import { apiStreamEvent } from "../../../generated/client/board";
import type { ApiStreamEvent200 } from "../../../generated/types/apiStreamEvent200";
import type { GameFinishEvent } from "../../../generated/types/gameFinishEvent";
import type { GameStartEvent } from "../../../generated/types/gameStartEvent";
import { createStreamHeaders } from "../../../lib/api";
import { readNdjsonStream, type StreamControl } from "../../../lib/stream";

type UseEventStreamConfig = {
	enabled: boolean;
	onGameStart?: (event: GameStartEvent) => void;
	onGameFinish?: (event: GameFinishEvent) => void;
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
							onGameFinishRef.current?.(event);
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

		void connect();

		return () => {
			try {
				controller.abort();
			} catch {}
			streamRef.current?.close();
			streamRef.current = null;
		};
	}, [enabled]);
}
