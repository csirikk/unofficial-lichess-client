/**
 * Chess Logic
 */
import {
	Chess,
	type Color as ChessColor,
	type PieceSymbol,
	type Square,
	type Piece,
	type Move,
} from "chess.js";
import { GameColor as Color } from "../../../generated/types/gameColor";
import type { GameFullEvent } from "../../../generated/types/gameFullEvent";
import type { UserExtended } from "../../../generated/types/userExtended";

/**
 * Canonical board representation using chess.js Piece type.
 */
export type PieceMap = Partial<Record<Square, Piece>>;

/**
 * Compatible with react-chessboard.
 */
export type PieceMapKey = `${ChessColor}${Uppercase<PieceSymbol>}`;

/**
 * A single move in the history.
 */
export interface MoveModel extends Partial<Move> {
	uci: string;
	fen: string;
	check: boolean;
}

export type PremoveModel = {
	uci: string;
	from: Square;
	to: Square;
	promotion?: PromotionPieceModel;
};

/**
 * Compatible with chess.js.
 */
export type PromotionPieceModel = "q" | "r" | "b" | "n";

export type PromotionRequestModel = {
	from: Square;
	to: Square;
	color: Color;
	mode: "live" | "premove";
} | null;

/**
 * Metrics for positioning the promotion dropdown overlay.
 */
export type PromotionMetricsModel = {
	left: number;
	top: number;
	squareSize: number;
	direction: "down" | "up";
};

/**
 * Ghost piece for premove overlay (shows original position during premove).
 */
export type GhostPieceModel = {
	square: Square;
	piece: Piece;
};

export const PIECES_VALUES: Record<string, number> = {
	p: 1,
	n: 3,
	b: 3,
	r: 5,
	q: 9,
	k: 0,
};

export const PIECES_UNICODE: Record<PieceSymbol, string> = {
	p: "♟︎",
	n: "♞",
	b: "♝",
	r: "♜",
	q: "♛",
	k: "♚",
};

export function sortCapturedPieces(pieces: PieceSymbol[]): void {
	pieces.sort((a, b) => PIECES_VALUES[a] - PIECES_VALUES[b]);
}

/**
 * Convert chess.js Color ("w" | "b") to GameColor ("white" | "black")
 */
export function chessColorToGameColor(chessColor: ChessColor): Color {
	return chessColor === "w" ? Color.white : Color.black;
}

/**
 * Convert GameColor ("white" | "black") to chess.js Color ("w" | "b")
 */
export function gameColorToChessColor(gameColor: Color): ChessColor {
	return gameColor === Color.white ? "w" : "b";
}

/**
 * Builds a game from a list of moves string to build a rich history.
 */
export function buildGameHistory(
	movesStr: string,
	initialFen = "startpos",
): {
	history: MoveModel[];
	fen: string;
	turn: Color;
} {
	const fenToLoad = initialFen === "startpos" ? undefined : initialFen;
	const chess = new Chess(fenToLoad);

	const moves = movesStr.trim() ? movesStr.trim().split(/\s+/).filter(Boolean) : [];
	const history: MoveModel[] = [];

	for (const uci of moves) {
		try {
			const moveObj = uciToMove(uci);
			const result = chess.move(moveObj);
			if (result) {
				history.push({
					...result,
					uci,
					fen: chess.fen(),
					check: chess.isCheck(),
				});
			}
		} catch (error) {
			console.error(`Failed to process move ${uci}`, error);
		}
	}

	return {
		history,
		fen: chess.fen(),
		turn: chessColorToGameColor(chess.turn()),
	};
}

export function getMaterialScore(board: PieceMap): { white: number; black: number } {
	let white = 0;
	let black = 0;
	for (const piece of Object.values(board)) {
		if (!piece) continue;
		const val = PIECES_VALUES[piece.type] || 0;
		if (piece.color === "w") white += val;
		else black += val;
	}
	return { white, black };
}

/**
 * Aggregates captured pieces from the history up to a specific point.
 */
export function computeCapturedAt(
	history: MoveModel[],
	atIndex: number | null,
): { white: PieceSymbol[]; black: PieceSymbol[] } {
	const white: PieceSymbol[] = [];
	const black: PieceSymbol[] = [];

	// Determine how many moves to count
	const limit = atIndex === null ? history.length : atIndex + 1;
	const subset = history.slice(0, limit);

	for (const move of subset) {
		if (move.captured) {
			if (move.color === "w") {
				white.push(move.captured); // White moved and captured a piece
			} else {
				black.push(move.captured); // Black moved and captured a piece
			}
		}
	}

	// Sort by value (p -> q)
	sortCapturedPieces(white);
	sortCapturedPieces(black);

	return { white, black };
}

export function pieceToKey(piece: Piece): PieceMapKey {
	return `${piece.color}${piece.type.toUpperCase()}` as PieceMapKey;
}

export function keyToPiece(key: PieceMapKey): Piece {
	return {
		color: key[0] as ChessColor,
		type: key[1].toLowerCase() as PieceSymbol,
	};
}

/**
 * Create a PieceMap from a chess.js instance
 */
export function pieceMapFromChess(chess: Chess): PieceMap {
	const pieceMap: PieceMap = {};
	const matrix = chess.board();

	for (let rank = 0; rank < 8; rank++) {
		for (let file = 0; file < 8; file++) {
			const piece = matrix[rank][file];
			if (!piece) continue;

			const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
			const rankChar = (8 - rank).toString();
			const square = `${fileChar}${rankChar}` as Square;

			pieceMap[square] = { color: piece.color, type: piece.type };
		}
	}
	return pieceMap;
}

/**
 * Convert PieceMap to the format expected by react-chessboard
 */
export function pieceMapToChessboard(pieceMap: PieceMap): Record<string, { pieceType: string }> {
	const out: Record<string, { pieceType: string }> = {};
	for (const [square, piece] of Object.entries(pieceMap)) {
		if (piece) {
			out[square] = { pieceType: pieceToKey(piece) };
		}
	}
	return out;
}

/**
 * Apply a premove visually to a pieceMap. Returns the new board and any ghost pieces.
 */
export function applyPremoves(
	baseBoard: PieceMap,
	premoves: PremoveModel[],
): { board: PieceMap; ghosts: GhostPieceModel[] } {
	const board: PieceMap = { ...baseBoard };
	const ghosts: GhostPieceModel[] = [];

	for (const premove of premoves) {
		const piece = board[premove.from];
		if (!piece) continue;

		const originalPiece = baseBoard[premove.from];

		if (originalPiece && originalPiece.type === piece.type && originalPiece.color === piece.color) {
			ghosts.push({ square: premove.from, piece: originalPiece });
		}

		delete board[premove.from];

		// Apply promotion if any
		const finalPiece: Piece = premove.promotion
			? { color: piece.color, type: premove.promotion }
			: piece;

		board[premove.to] = finalPiece;
	}

	return { board, ghosts };
}

/**
 * Check if a piece can feasibly make a premove. Ignores blocking pieces, captures, etc.
 */
export function isFeasiblePremove(piece: Piece, from: Square, to: Square): boolean {
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
			return (adx === 1 && ady === 2) || (adx === 2 && ady === 1); // L-shape
		}
		case "b":
			return Math.abs(dx) === Math.abs(dy); // Diagonal
		case "r":
			return (dx === 0 && dy !== 0) || (dy === 0 && dx !== 0); // Straight
		case "q":
			return (dx === 0 && dy !== 0) || (dy === 0 && dx !== 0) || Math.abs(dx) === Math.abs(dy); // Straight or diagonal
		case "k":
			return (dy === 0 && (dx === 2 || dx === -2)) || Math.max(Math.abs(dx), Math.abs(dy)) === 1; // One square any direction or castling
		default:
			return false;
	}
}

/**
 * UCI format: e2e4, e7e5, e7e8q (promotion)
 * chess.js format: { from: 'e2', to: 'e4', promotion?: 'q' }
 */
export function uciToMove(uci: string): {
	from: string;
	to: string;
	promotion?: string;
} {
	if (uci.length < 4) {
		throw new Error(`Invalid UCI move: ${uci}`);
	}

	const from = uci.substring(0, 2);
	const to = uci.substring(2, 4);
	const promotion = uci.length > 4 ? uci.substring(4, 5) : undefined;

	return { from, to, promotion };
}

/**
 * UCI format: e2e4, e7e5, e7e8q (promotion)
 * chess.js format: { from: 'e2', to: 'e4', promotion?: 'q' }
 */
export function moveToUci(move: { from: string; to: string; promotion?: string }): string {
	return `${move.from}${move.to}${move.promotion || ""}`;
}

export function findKingSquare(board: PieceMap, color: Color): Square | null {
	const chessCol = gameColorToChessColor(color);
	for (const [square, piece] of Object.entries(board)) {
		if (piece && piece.type === "k" && piece.color === chessCol) {
			return square as Square;
		}
	}
	return null;
}

export function getPlayerColor(gameFull: GameFullEvent | null, user: UserExtended | null): Color {
	if (!gameFull || !user) return Color.white;

	const userId = user.id?.toLowerCase();
	const whiteId = gameFull.white?.id?.toLowerCase();
	const blackId = gameFull.black?.id?.toLowerCase();

	if (userId && whiteId === userId) return Color.white;
	if (userId && blackId === userId) return Color.black;
	return Color.white;
}

export function isPlayerInGame(gameFull: GameFullEvent | null, user: UserExtended | null): boolean {
	if (!gameFull || !user) return false;

	const userId = user.id?.toLowerCase();
	const whiteId = gameFull.white?.id?.toLowerCase();
	const blackId = gameFull.black?.id?.toLowerCase();

	return Boolean(userId && (whiteId === userId || blackId === userId));
}

/**
 * Format milliseconds as clock display (MM:SS).
 */
export function formatClockTime(ms: number | null): string {
	if (ms == null) return "∞";
	const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
