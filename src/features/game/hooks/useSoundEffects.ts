/**
 * useSoundEffects Hook
 *
 * Manages sound playback based on game state changes
 */

import { useCallback, useEffect, useRef } from "react";
import { playSound, type SoundType } from "../model/sounds";
import type { MoveModel } from "../model/chess";

type SoundEffectsConfig = {
	gameId: string | null;
	moveHistory: MoveModel[];
	isGameStarted: boolean;
	isGameEnded: boolean;
	isViewingHistory: boolean;
	viewingMoveIndex: number | null;
	whiteTime?: number;
	blackTime?: number;
};

// Priority: check > castle > promotion > capture > normal move
function detectMoveSound(move: MoveModel): SoundType {
	if (move.check) return "move-check";
	const isKingMove = move.san === "O-O" || move.san === "O-O-O";
	if (isKingMove) return "castle";
	if (move.promotion) return "promote";
	if (move.captured) return "capture";
	return "move-self";
}

export function useSoundEffects(config: SoundEffectsConfig): {
	playMoveSound: (move: MoveModel) => void;
} {
	const {
		gameId,
		moveHistory,
		isGameStarted,
		isGameEnded,
		isViewingHistory,
		viewingMoveIndex,
		whiteTime,
		blackTime,
	} = config;

	const lastViewedIndexRef = useRef<number | null>(null);
	const gameStartedRef = useRef(false);
	const gameEndedRef = useRef(false);
	const lastLiveMovesCountRef = useRef(0);
	const isInitialLoadRef = useRef(true);

	const lastGameIdRef = useRef<string | null>(null);
	const playedMovesRef = useRef<Set<string>>(new Set());

	const tenSecondsPlayedRef = useRef<{
		white: { played: boolean; lastTime: number | null };
		black: { played: boolean; lastTime: number | null };
	}>({
		white: { played: false, lastTime: null },
		black: { played: false, lastTime: null },
	});

	// Play game start sound
	useEffect(() => {
		if (isGameStarted && !gameStartedRef.current && !isViewingHistory) {
			playSound("game-start");
			gameStartedRef.current = true;
		}
	}, [isGameStarted, isViewingHistory]);

	// Play game end sound
	useEffect(() => {
		if (isGameEnded && !gameEndedRef.current && !isViewingHistory) {
			playSound("game-end");
			gameEndedRef.current = true;
		}
	}, [isGameEnded, isViewingHistory]);

	// Optimistic move sound
	const playMoveSound = useCallback(
		(move: MoveModel) => {
			if (isViewingHistory) return;
			const soundType = detectMoveSound(move);
			playSound(soundType);

			// Mark this move as played
			const moveKey = `${move.from}${move.to}${move.promotion || ""}`;
			playedMovesRef.current.add(moveKey);
		},
		[isViewingHistory],
	);

	// Listen for premove execution events and play sound immediately
	useEffect(() => {
		const handlePremoveSound = (event: Event) => {
			const customEvent = event as CustomEvent<MoveModel>;
			if (customEvent.detail) {
				playMoveSound(customEvent.detail);
			}
		};

		window.addEventListener("chess-premove-sound", handlePremoveSound);
		return () => window.removeEventListener("chess-premove-sound", handlePremoveSound);
	}, [playMoveSound]);

	// Play sounds when navigating through history
	useEffect(() => {
		if (!isViewingHistory || viewingMoveIndex === null) {
			lastViewedIndexRef.current = viewingMoveIndex;
			return;
		}

		const lastIndex = lastViewedIndexRef.current ?? -1;
		// Only play sound when moving forward
		if (viewingMoveIndex > lastIndex) {
			if (viewingMoveIndex >= 0 && viewingMoveIndex < moveHistory.length) {
				const move = moveHistory[viewingMoveIndex];
				const soundType = detectMoveSound(move);
				playSound(soundType);
			}
		}
		lastViewedIndexRef.current = viewingMoveIndex;
	}, [isViewingHistory, viewingMoveIndex, moveHistory]);

	// Server moves
	useEffect(() => {
		if (isViewingHistory) return;
		if (!isGameStarted) return;

		const currentMoveCount = moveHistory.length;

		if (gameId !== lastGameIdRef.current) {
			lastGameIdRef.current = gameId;
			isInitialLoadRef.current = true;
			lastLiveMovesCountRef.current = 0;
			playedMovesRef.current.clear();
			gameStartedRef.current = false;
			gameEndedRef.current = false;
			tenSecondsPlayedRef.current = {
				white: { played: false, lastTime: null },
				black: { played: false, lastTime: null },
			};
		}

		// If first load, skip playing sounds
		if (isInitialLoadRef.current) {
			isInitialLoadRef.current = false;
			lastLiveMovesCountRef.current = currentMoveCount;
			return;
		}

		// Play sounds for any moves added since last render
		if (currentMoveCount > lastLiveMovesCountRef.current) {
			for (let i = lastLiveMovesCountRef.current; i < currentMoveCount; i++) {
				const move = moveHistory[i];
				const moveKey = `${move.from}${move.to}${move.promotion || ""}`;

				// Only play if we havent already played this
				if (!playedMovesRef.current.has(moveKey)) {
					const soundType = detectMoveSound(move);
					playSound(soundType);
					playedMovesRef.current.add(moveKey);
				}
			}
		}

		lastLiveMovesCountRef.current = currentMoveCount;
	}, [moveHistory, isViewingHistory, gameId, isGameStarted]);

	// Ten seconds warning
	useEffect(() => {
		if (isViewingHistory || !isGameStarted || isGameEnded) return;

		const TEN_SECONDS_MS = 10000;
		const RESET_THRESHOLD_MS = 15000;

		const checkTime = (time: number, color: "white" | "black") => {
			const state = tenSecondsPlayedRef.current[color];

			if (
				time <= TEN_SECONDS_MS &&
				time > 0 &&
				!state.played &&
				(state.lastTime == null || state.lastTime > TEN_SECONDS_MS)
			) {
				playSound("tenseconds");
				state.played = true;
			}

			if (time > RESET_THRESHOLD_MS && state.played) {
				state.played = false;
			}
			state.lastTime = time;
		};

		if (whiteTime != null) checkTime(whiteTime, "white");
		if (blackTime != null) checkTime(blackTime, "black");
	}, [whiteTime, blackTime, isViewingHistory, isGameStarted, isGameEnded]);

	return { playMoveSound };
}
