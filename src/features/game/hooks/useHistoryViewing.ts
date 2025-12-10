/**
 * useHistoryViewing Hook
 *
 * Manages history viewing state for reviewing past positions during a game.
 */
import { Chess, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { pieceMapFromChess, pieceMapToChessboard } from "../model/chess";
import type { MoveModel } from "../model/chess";

export type HistoryViewingConfig = {
	chess: Chess; // The main chess.js instance representing the current game
	serverHistory: MoveModel[]; // Full move history from the server
};

export type HistoryViewingReturn = {
	viewingMoveIndex: number | null; // null = live, -1 = starting position
	isViewingHistory: boolean;
	displayPosition: Record<string, { pieceType: string }>;
	viewedLastMove: { from: Square | null; to: Square | null };
	goToMove: (index: number | null) => void;
	goToStart: () => void;
	goBack: () => void;
	goForward: () => void;
	goToLive: () => void;
	totalMoves: number;
};

export function useHistoryViewing({
	chess,
	serverHistory,
}: HistoryViewingConfig): HistoryViewingReturn {
	const [viewingMoveIndex, setViewingMoveIndex] = useState<number | null>(null);

	const totalMoves = serverHistory.length;

	// Compute the displayed position based on viewingMoveIndex
	const { displayPosition, viewedLastMove } = useMemo(() => {
		// Live mode - show current position from the main chess instance
		if (viewingMoveIndex === null) {
			const pos = pieceMapToChessboard(pieceMapFromChess(chess));

			const lastMove =
				serverHistory.length > 0
					? {
							from: serverHistory[serverHistory.length - 1].from as Square,
							to: serverHistory[serverHistory.length - 1].to as Square,
						}
					: { from: null, to: null };

			return { displayPosition: pos, viewedLastMove: lastMove };
		}

		// Historical position
		if (viewingMoveIndex >= 0 && viewingMoveIndex < serverHistory.length) {
			const move = serverHistory[viewingMoveIndex];
			const tempChess = new Chess(move.fen);
			const pos = pieceMapToChessboard(pieceMapFromChess(tempChess));

			const lastMove = {
				from: move.from as Square,
				to: move.to as Square,
			};
			return { displayPosition: pos, viewedLastMove: lastMove };
		}

		// Start position
		const tempChess = new Chess();
		const pos = pieceMapToChessboard(pieceMapFromChess(tempChess));
		return { displayPosition: pos, viewedLastMove: { from: null, to: null } };
	}, [chess, viewingMoveIndex, serverHistory]);

	const isViewingHistory = viewingMoveIndex !== null;

	// Navigation handlers
	const goToMove = useCallback(
		(index: number | null) => {
			if (index === null) {
				setViewingMoveIndex(null);
				return;
			}
			// Snap to live mode if navigating to the last move (enables interactions immediately)
			if (index >= totalMoves - 1) {
				setViewingMoveIndex(null);
				return;
			}
			// Clamp to valid range: -1 to totalMoves - 2
			const clamped = Math.max(-1, index);
			setViewingMoveIndex(clamped);
		},
		[totalMoves],
	);

	const goToStart = useCallback(() => {
		setViewingMoveIndex(-1);
	}, []);

	const goBack = useCallback(() => {
		if (totalMoves === 0) return;

		setViewingMoveIndex((current) => {
			if (current === null) {
				return totalMoves - 2;
			}
			if (current <= -1) {
				return -1;
			}
			return current - 1;
		});
	}, [totalMoves]);

	const goForward = useCallback(() => {
		if (totalMoves === 0) return;

		setViewingMoveIndex((current) => {
			if (current === null) {
				return null;
			}
			if (current >= totalMoves - 2) {
				return null;
			}
			return current + 1;
		});
	}, [totalMoves]);

	const goToLive = useCallback(() => {
		setViewingMoveIndex(null);
	}, []);

	useEffect(() => {
		if (serverHistory.length === 0) {
			setViewingMoveIndex(null);
		}
	}, [serverHistory.length]);

	useEffect(() => {
		if (viewingMoveIndex !== null && viewingMoveIndex >= totalMoves) {
			setViewingMoveIndex(null);
		}
	}, [totalMoves, viewingMoveIndex]);

	return {
		viewingMoveIndex,
		isViewingHistory,
		displayPosition,
		viewedLastMove,
		goToMove,
		goToStart,
		goBack,
		goForward,
		goToLive,
		totalMoves,
	};
}
