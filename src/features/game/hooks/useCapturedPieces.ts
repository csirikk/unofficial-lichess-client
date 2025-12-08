/**
 * useCapturedPieces Hook
 *
 * ViewModel layer for captured pieces and material difference calculations.
 */
import { Chess, type PieceSymbol } from "chess.js";
import { useMemo } from "react";
import {
	type UiBoard,
	type UiMove,
	boardFromChess,
	computeCapturedAt,
	getMaterialScore,
	uciToMove,
} from "../model/chess";

export type CapturedPiecesConfig = {
	serverHistory: UiMove[];
	serverFen: string;
	pendingUci: string | null;
	viewingMoveIndex: number | null; // null = live, -1 = starting position
	chess: Chess;
	isViewingHistory: boolean;
};

export type CapturedPiecesReturn = {
	captured: { white: PieceSymbol[]; black: PieceSymbol[] };
	material: { white: number; black: number };
	whiteDiff: number;
	blackDiff: number;
};

export function useCapturedPieces({
	serverHistory,
	serverFen,
	pendingUci,
	viewingMoveIndex,
	chess,
	isViewingHistory,
}: CapturedPiecesConfig): CapturedPiecesReturn {
	return useMemo(() => {
		const captured = computeCapturedAt(serverHistory, viewingMoveIndex);

		if (viewingMoveIndex === null && pendingUci) {
			try {
				const temp = new Chess(serverFen);
				const move = temp.move(uciToMove(pendingUci));

				if (move?.captured) {
					if (move.color === "w") {
						captured.white.push(move.captured);
					} else {
						captured.black.push(move.captured);
					}
				}
			} catch (error) {
				console.error("Error processing pending move:", error);
			}
		}

		let board: UiBoard;

		if (isViewingHistory && viewingMoveIndex !== null && viewingMoveIndex >= 0) {
			// History mode - use the FEN from the viewed move
			const move = serverHistory[viewingMoveIndex];
			const tempChess = new Chess(move.fen);
			board = boardFromChess(tempChess);
		} else if (isViewingHistory && viewingMoveIndex === -1) {
			// Start position
			const tempChess = new Chess();
			board = boardFromChess(tempChess);
		} else {
			// Live mode - use the current chess instance (includes pending moves)
			board = boardFromChess(chess);
		}

		const material = getMaterialScore(board);
		const whiteDiff = Math.max(0, material.white - material.black);
		const blackDiff = Math.max(0, material.black - material.white);

		return {
			captured,
			material,
			whiteDiff,
			blackDiff,
		};
	}, [serverHistory, serverFen, pendingUci, viewingMoveIndex, chess, isViewingHistory]);
}
