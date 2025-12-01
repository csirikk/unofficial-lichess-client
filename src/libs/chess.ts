/**
 * Canonical UI types for chess display and interaction. Bridge between chess.js, Lichess API types, and react-chessboard.
 */
import type { Chess, Color, PieceSymbol, Square } from "chess.js";

/**
 * Canonical piece type used everywhere in the frontend. Directly compatible with chess.js.
 */
export type UiPiece = {
	color: Color; // "w" | "b"
	type: PieceSymbol; // "p" | "n" | "b" | "r" | "q" | "k"
};

/**
 * Canonical board representation.
 */
export type UiBoard = Partial<Record<Square, UiPiece>>;

/**
 * Piece key used by react-chessboard and defaultPieces ("wP", "bK", ...).
 */
export type UiPieceKey = `${Color}${Uppercase<PieceSymbol>}`;

/**
 * Ghost piece for premove overlay (shows original position during premove).
 */
export type UiGhostPiece = {
	square: Square;
	piece: UiPiece;
};

/**
 * Promotion letters (UCI / chess.js compatible).
 */
export type UiPromotionPiece = "q" | "r" | "b" | "n";

/**
 * Premove (queued move) with UCI as canonical ID.
 */
export type UiPremove = {
	uci: string;
	from: Square;
	to: Square;
	promotion?: UiPromotionPiece;
};

/**
 * Promotion request state for UI.
 */
export type UiPromotionRequest = {
	from: Square;
	to: Square;
	color: Color;
	mode: "live" | "premove";
} | null;

/**
 * Metrics for positioning the promotion dropdown overlay.
 */
export type UiPromotionDropdownMetrics = {
	left: number;
	top: number;
	squareSize: number;
	direction: "down" | "up";
};

export function pieceToKey(piece: UiPiece): UiPieceKey {
	return `${piece.color}${piece.type.toUpperCase()}` as UiPieceKey;
}

export function keyToPiece(key: UiPieceKey): UiPiece {
	return {
		color: key[0] as Color,
		type: key[1].toLowerCase() as PieceSymbol,
	};
}

/**
 * Create a UiBoard from a chess.js instance
 */
export function boardFromChess(chess: Chess): UiBoard {
	const uiBoard: UiBoard = {};
	const matrix = chess.board();

	for (let rank = 0; rank < 8; rank++) {
		for (let file = 0; file < 8; file++) {
			const piece = matrix[rank][file];
			if (!piece) continue;

			const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
			const rankChar = (8 - rank).toString();
			const square = `${fileChar}${rankChar}` as Square;

			uiBoard[square] = { color: piece.color, type: piece.type };
		}
	}
	return uiBoard;
}

/**
 * Convert UiBoard to the position format expected by react-chessboard
 */
export function boardToChessboardPosition(uiBoard: UiBoard): Record<string, { pieceType: string }> {
	const out: Record<string, { pieceType: string }> = {};
	for (const [square, piece] of Object.entries(uiBoard)) {
		if (piece) {
			out[square] = { pieceType: pieceToKey(piece) };
		}
	}
	return out;
}

/**
 * Apply a premove visually to a UiBoard. Returns the new board and any ghost pieces.
 */
export function applyPremoves(
	baseBoard: UiBoard,
	premoves: UiPremove[],
): { board: UiBoard; ghosts: UiGhostPiece[] } {
	const board: UiBoard = { ...baseBoard };
	const ghosts: UiGhostPiece[] = [];

	for (const premove of premoves) {
		const piece = board[premove.from];
		if (!piece) continue;

		// Record ghost at original position
		ghosts.push({ square: premove.from, piece });

		// Move piece
		delete board[premove.from];

		// Apply promotion if any
		const finalPiece: UiPiece = premove.promotion
			? { color: piece.color, type: premove.promotion }
			: piece;

		board[premove.to] = finalPiece;
	}

	return { board, ghosts };
}

/**
 * Check if a piece can feasibly make a premove pattern. Ignores blocking pieces, captures, etc.
 */
export function isFeasiblePremove(piece: UiPiece, from: Square, to: Square): boolean {
	const fileFrom = from.charCodeAt(0) - "a".charCodeAt(0);
	const rankFrom = parseInt(from[1], 10) - 1;
	const fileTo = to.charCodeAt(0) - "a".charCodeAt(0);
	const rankTo = parseInt(to[1], 10) - 1;

	if (
		fileFrom < 0 ||
		fileFrom > 7 ||
		fileTo < 0 ||
		fileTo > 7 ||
		rankFrom < 0 ||
		rankFrom > 7 ||
		rankTo < 0 ||
		rankTo > 7
	) {
		return false;
	}

	const dx = fileTo - fileFrom;
	const dy = rankTo - rankFrom;

	if (dx === 0 && dy === 0) return false;

	switch (piece.type) {
		case "p": {
			const forward = piece.color === "w" ? 1 : -1;
			const startRank = piece.color === "w" ? 1 : 6;
			if (dx === 0 && dy === forward) return true; // Single push
			if (dx === 0 && dy === 2 * forward && rankFrom === startRank) return true; // Double push from starting rank
			if (Math.abs(dx) === 1 && dy === forward) return true; // Diagonal capture
			return false;
		}
		case "n": {
			const adx = Math.abs(dx);
			const ady = Math.abs(dy);
			return (adx === 1 && ady === 2) || (adx === 2 && ady === 1);
		}
		case "b":
			return Math.abs(dx) === Math.abs(dy);
		case "r":
			return (dx === 0 && dy !== 0) || (dy === 0 && dx !== 0);
		case "q":
			return (dx === 0 && dy !== 0) || (dy === 0 && dx !== 0) || Math.abs(dx) === Math.abs(dy);
		case "k":
			return (dy === 0 && (dx === 2 || dx === -2)) || Math.max(Math.abs(dx), Math.abs(dy)) === 1;
		default:
			return false;
	}
}

/**
 * Find the king square for a given color.
 */
export function findKingSquare(board: UiBoard, color: Color): Square | null {
	for (const [square, piece] of Object.entries(board)) {
		if (piece && piece.type === "k" && piece.color === color) {
			return square as Square;
		}
	}
	return null;
}

/**
 * Format milliseconds as clock display (MM:SS).
 */
export function formatClockTime(ms: number | null): string {
	if (ms == null) return "--:--";
	const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
