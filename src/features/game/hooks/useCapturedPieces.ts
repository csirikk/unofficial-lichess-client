/**
 * useCapturedPieces.ts
 *
 * Hook computing captured pieces and material differences.
 */

import { Chess, type PieceSymbol } from "chess.js";
import { useMemo } from "react";
import {
	type PieceMap,
	type MoveModel,
	pieceMapFromChess,
	computeCapturedAt,
	getMaterialScore,
	uciToMove,
	sortCapturedPieces,
} from "../model/chess";

export type CapturedPiecesConfig = {
	serverHistory: MoveModel[];
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
	pendingUci,
	viewingMoveIndex,
	chess,
	isViewingHistory,
}: CapturedPiecesConfig): CapturedPiecesReturn {
	return useMemo(() => {
		let captured = computeCapturedAt(serverHistory, viewingMoveIndex);

		let board: PieceMap;

		if (isViewingHistory && viewingMoveIndex !== null && viewingMoveIndex >= 0) {
			// History mode - use the FEN from the viewed move
			const move = serverHistory[viewingMoveIndex];
			const tempChess = new Chess(move.fen);
			board = pieceMapFromChess(tempChess);
		} else if (isViewingHistory && viewingMoveIndex === -1) {
			// Start position
			const tempChess = new Chess();
			board = pieceMapFromChess(tempChess);
		} else {
			// Live mode - use the current chess instance (includes pending moves)
			board = pieceMapFromChess(chess);

			// Count captured pieces for optimistic pending move even though its not confirmed
			if (pendingUci) {
				try {
					const lastServerMove = serverHistory[serverHistory.length - 1];
					const beforePendingFen = lastServerMove?.fen || undefined;
					const temp = new Chess(beforePendingFen);
					const move = temp.move(uciToMove(pendingUci));

					if (move?.captured) {
						captured = {
							white: [...captured.white],
							black: [...captured.black],
						};

						if (move.color === "w") {
							captured.white.push(move.captured);
							sortCapturedPieces(captured.white);
						} else {
							captured.black.push(move.captured);
							sortCapturedPieces(captured.black);
						}
					}
				} catch {}
			}
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
	}, [serverHistory, pendingUci, viewingMoveIndex, chess, isViewingHistory]);
}
