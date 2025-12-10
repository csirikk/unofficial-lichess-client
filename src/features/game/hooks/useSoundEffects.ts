/**
 * useSoundEffects Hook
 *
 * Manages sound playback based on game state changes
 */

import { useCallback, useEffect, useRef } from "react";
import { playSound, type SoundType } from "../model/sounds";
import type { UiMove } from "../model/chess";

type SoundEffectsConfig = {
	moveHistory: UiMove[];
	gameStarted: boolean;
	gameEnded: boolean;
	isViewingHistory: boolean;
	viewingMoveIndex: number | null;
	whiteTime?: number;
	blackTime?: number;
};

// Priority: check > castle > promotion > capture > normal move
function detectMoveSound(move: UiMove): SoundType {
	if (move.check) {
		return "move-check";
	}

	const isKingMove = move.san === "O-O" || move.san === "O-O-O";
	if (isKingMove) {
		return "castle";
	}

	if (move.promotion) {
		return "promote";
	}

	if (move.captured) {
		return "capture";
	}

	return "move-self";
}

export function useSoundEffects(config: SoundEffectsConfig): {
	playMoveSound: (move: UiMove) => void;
} {
	const {
		moveHistory,
		gameStarted,
		gameEnded,
		isViewingHistory,
		viewingMoveIndex,
		whiteTime,
		blackTime,
	} = config;

	const lastProcessedIndexRef = useRef(-1);
	const lastViewedIndexRef = useRef<number | null>(null);
	const gameStartedRef = useRef(false);
	const gameEndedRef = useRef(false);
	const playedMovesRef = useRef(new Set<string>());
	const tenSecondsPlayedRef = useRef<{
		white: { played: boolean; lastTime: number | null };
		black: { played: boolean; lastTime: number | null };
	}>({
		white: { played: false, lastTime: null },
		black: { played: false, lastTime: null },
	});

	// Play game start sound
	useEffect(() => {
		if (gameStarted && !gameStartedRef.current && !isViewingHistory) {
			playSound("game-start");
			gameStartedRef.current = true;
		}
	}, [gameStarted, isViewingHistory]);

	// Play game end sound
	useEffect(() => {
		if (gameEnded && !gameEndedRef.current && !isViewingHistory) {
			playSound("game-end");
			gameEndedRef.current = true;
		}
	}, [gameEnded, isViewingHistory]);

	// Optimistic move sound
	const playMoveSound = useCallback(
		(move: UiMove) => {
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
			const customEvent = event as CustomEvent<UiMove>;
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

		// Check if we moved to a different position
		if (lastViewedIndexRef.current !== viewingMoveIndex) {
			// Play sound for the move at this index (if not start position)
			if (viewingMoveIndex >= 0 && viewingMoveIndex < moveHistory.length) {
				const move = moveHistory[viewingMoveIndex];
				const soundType = detectMoveSound(move);
				playSound(soundType);
			}
			lastViewedIndexRef.current = viewingMoveIndex;
		}
	}, [isViewingHistory, viewingMoveIndex, moveHistory]);

	// Server moves
	useEffect(() => {
		if (isViewingHistory) return;

		const currentLastIndex = moveHistory.length - 1;

		if (currentLastIndex > lastProcessedIndexRef.current) {
			const startIndex = Math.max(0, lastProcessedIndexRef.current + 1);

			for (let i = startIndex; i <= currentLastIndex; i++) {
				const move = moveHistory[i];
				const moveKey = `${move.from}${move.to}${move.promotion || ""}`;

				// Only play if we havent already played this
				if (!playedMovesRef.current.has(moveKey)) {
					const soundType = detectMoveSound(move);
					playSound(soundType);
				}
			}
		}

		lastProcessedIndexRef.current = currentLastIndex;
	}, [moveHistory, isViewingHistory]);

	// Ten seconds warning
	useEffect(() => {
		if (isViewingHistory || !gameStarted || gameEnded) return;

		const TEN_SECONDS_MS = 10000;
		const RESET_THRESHOLD_MS = 15000;

		if (whiteTime != null) {
			const whiteState = tenSecondsPlayedRef.current.white;

			if (
				whiteTime <= TEN_SECONDS_MS &&
				whiteTime > 0 &&
				!whiteState.played &&
				(whiteState.lastTime == null || whiteState.lastTime > TEN_SECONDS_MS)
			) {
				playSound("tenseconds");
				tenSecondsPlayedRef.current.white.played = true;
			}

			if (whiteTime > RESET_THRESHOLD_MS && whiteState.played) {
				tenSecondsPlayedRef.current.white.played = false;
			}

			tenSecondsPlayedRef.current.white.lastTime = whiteTime;
		}

		if (blackTime != null) {
			const blackState = tenSecondsPlayedRef.current.black;

			if (
				blackTime <= TEN_SECONDS_MS &&
				blackTime > 0 &&
				!blackState.played &&
				(blackState.lastTime == null || blackState.lastTime > TEN_SECONDS_MS)
			) {
				playSound("tenseconds");
				tenSecondsPlayedRef.current.black.played = true;
			}

			if (blackTime > RESET_THRESHOLD_MS && blackState.played) {
				tenSecondsPlayedRef.current.black.played = false;
			}

			tenSecondsPlayedRef.current.black.lastTime = blackTime;
		}
	}, [whiteTime, blackTime, isViewingHistory, gameStarted, gameEnded]);

	useEffect(() => {
		if (!gameStarted) {
			playedMovesRef.current.clear();
			lastProcessedIndexRef.current = -1;
			gameStartedRef.current = false;
			gameEndedRef.current = false;
			tenSecondsPlayedRef.current = {
				white: { played: false, lastTime: null },
				black: { played: false, lastTime: null },
			};
		} else if (gameEnded) {
			playedMovesRef.current.clear();
		}
	}, [gameStarted, gameEnded]);

	return { playMoveSound };
}
