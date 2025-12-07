/**
 * useGameStream Hook
 *
 * Manages the game stream connection to Lichess Board API.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, type Color } from "chess.js";
import { boardGameMove, boardGameStream } from "../../../generated/client/board";
import type { BoardGameStream200 } from "../../../generated/types/boardGameStream200";
import type { GameFullEvent } from "../../../generated/types/gameFullEvent";
import type { GameStateEvent } from "../../../generated/types/gameStateEvent";
import { GameStatusName } from "../../../generated/types/gameStatusName";
import { createAuthHeaders, createStreamHeaders } from "../../../lib/api";
import { readNdjsonStream, type StreamControl } from "../../../lib/stream";
import { buildGameHistory, type UiMove } from "../model/chess";

const RECONNECT_DELAYS = [250, 500, 1000, 2000, 5000]; // ms between attempts

export type GameStreamState = {
	gameFull: GameFullEvent | null;
	gameState: GameStateEvent | null;
	serverFen: string;
	serverTurn: Color;
	serverHistory: UiMove[];
	error: string | null;
	streamNotFound: boolean;
	isConnected: boolean;
	isConnecting: boolean;
	isReconnecting: boolean;
	isOffline: boolean;
};

export type GameStreamReturn = GameStreamState & {
	makeMove: (uci: string) => Promise<unknown>;
};

export function useGameStream(gameId: string | null): GameStreamReturn {
	const [gameFull, setGameFull] = useState<GameFullEvent | null>(null);
	const [gameState, setGameState] = useState<GameStateEvent | null>(null);
	const [serverFen, setServerFen] = useState<string>(() => new Chess().fen());
	const [serverTurn, setServerTurn] = useState<Color>("w");
	const [serverHistory, setServerHistory] = useState<UiMove[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [streamNotFound, setStreamNotFound] = useState(false);

	const [connectionStatus, setConnectionStatus] = useState<
		"connecting" | "connected" | "reconnecting" | "offline"
	>("connecting");

	const statusRef = useRef<GameStatusName | null>(null);
	const activeGameIdRef = useRef<string | null>(null);
	const mountedRef = useRef(false);
	const initialFenRef = useRef<string>("start");

	const updateStateFromMoves = useCallback((movesStr: string, initialFen = "start") => {
		const { history, fen, turn } = buildGameHistory(movesStr, initialFen);
		setServerFen(fen);
		setServerTurn(turn);
		setServerHistory(history);
	}, []);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		if (!gameId) {
			activeGameIdRef.current = null;
			return;
		}

		if (activeGameIdRef.current !== gameId) {
			activeGameIdRef.current = gameId;
			setGameFull(null);
			setGameState(null);
			setServerFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
			setServerTurn("w");
			setServerHistory([]);
			setError(null);
			setStreamNotFound(false);
			setConnectionStatus("connecting");
			statusRef.current = null;
			initialFenRef.current = "start";
		}

		const abortController = new AbortController();
		let streamControl: StreamControl | null = null;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

		const connect = async (attempt: number) => {
			if (!mountedRef.current) return;

			setConnectionStatus(attempt === 0 ? "connecting" : "reconnecting");

			try {
				const response = await boardGameStream(gameId, {
					...createStreamHeaders(),
					signal: abortController.signal,
				});

				if (!mountedRef.current) return;

				if (response.status === 404) {
					setStreamNotFound(true);
					setConnectionStatus("offline");
					return;
				}

				if (response.status !== 200) {
					throw new Error(`HTTP ${response}`);
				}

				setConnectionStatus("connected");
				setError(null);

				streamControl = readNdjsonStream<BoardGameStream200>(
					`game-${gameId}`,
					response.stream,
					(event) => {
						if (!mountedRef.current) return;

						if (event.type === "gameFull") {
							const full = event as GameFullEvent;
							statusRef.current = full.state.status;
							initialFenRef.current = full.initialFen;
							setGameFull(full);
							setGameState(full.state);
							updateStateFromMoves(full.state.moves, full.initialFen);
						} else if (event.type === "gameState") {
							const state = event as GameStateEvent;
							statusRef.current = state.status;
							setGameState(state);
							setGameFull((prev) => (prev ? { ...prev, state } : prev));
							updateStateFromMoves(state.moves, initialFenRef.current);
						}

						if (statusRef.current && statusRef.current !== GameStatusName.started) {
							streamControl?.close();
						}
					},
				);

				await streamControl.closePromise;
			} catch (err) {
				const isAbort = err instanceof Error && err.name === "AbortError";
				if (isAbort || !mountedRef.current) return;

				console.warn(
					`[Stream] Disconnected (attempt ${attempt + 1}/${RECONNECT_DELAYS.length})`,
					err,
				);

				if (attempt < RECONNECT_DELAYS.length) {
					reconnectTimer = setTimeout(() => {
						connect(attempt + 1);
					}, RECONNECT_DELAYS[attempt]);
				} else {
					setConnectionStatus("offline");
					setError("Connection lost");
				}
			}
		};

		connect(0);

		return () => {
			abortController.abort();
			streamControl?.close();
			if (reconnectTimer) clearTimeout(reconnectTimer);
		};
	}, [gameId, updateStateFromMoves]);

	const makeMove = useCallback(
		async (uci: string): Promise<boolean> => {
			if (!gameId) {
				console.warn("No game ID available for making a move.");
				return false;
			}
			try {
				const response = await boardGameMove(gameId, uci, undefined, createAuthHeaders());

				if (response.status === 200) {
					return true;
				}

				console.warn("Lichess rejected move:", response.status);
				return false;
			} catch (e) {
				console.error("Network error sending move:", e);
				return false;
			}
		},
		[gameId],
	);

	return {
		gameFull,
		gameState,
		serverFen,
		serverTurn,
		serverHistory,
		error,
		streamNotFound,
		makeMove,
		isConnected: connectionStatus === "connected",
		isConnecting: connectionStatus === "connecting",
		isReconnecting: connectionStatus === "reconnecting",
		isOffline: connectionStatus === "offline",
	};
}
