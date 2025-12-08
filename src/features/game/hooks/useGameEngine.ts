/**
 * useGameEngine Hook
 *
 * Manages the truth of the game:
 * - Chess.js instance
 * - Server synchronization
 * - Optimistic updates
 * - Move execution (including premoves)
 */
import { Chess, type Square, type Color } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameColor } from "../../../generated/types/gameColor";
import { GameStatusName } from "../../../generated/types/gameStatusName";
import type { GameFullEvent } from "../../../generated/types/gameFullEvent";
import type { UserExtended } from "../../../generated/types/userExtended";
import {
	type UiBoard,
	type UiGhostPiece,
	type UiPiece,
	type UiPieceKey,
	type UiPremove,
	type UiPromotionRequest,
	applyPremoves,
	boardFromChess,
	boardToChessboardPosition,
	findKingSquare,
	getPlayerColor,
	isPlayerInGame,
	keyToPiece,
	uciToMove,
	type UiMove,
} from "../model/chess";

export type GameEngineConfig = {
	gameFull: GameFullEvent | null;
	serverFen: string;
	serverTurn: Color;
	serverHistory: UiMove[];
	user: UserExtended | null;
	isConnected: boolean;
	makeMove: (uci: string) => Promise<unknown>;
};

export type GameEngineState = {
	chess: Chess;
	position: Record<string, { pieceType: string }>;
	ghostPieces: UiGhostPiece[];
	lastMoveSquares: { from: Square | null; to: Square | null };
	checkSquare: Square | null;
	premoveQueue: UiPremove[];
	promotionRequest: UiPromotionRequest;
	showAnimations: boolean;
	moveHistory: string[];
	pendingUci: string | null;
};

export type GameEngineHandlers = {
	executeMove: (uci: string, isPremove?: boolean) => Promise<void>;
	rollbackToServer: () => void;
	getVisualPieceAt: (square: Square) => UiPiece | null;
	ownsSquare: (square: Square) => boolean;
	canPlayMove: () => boolean;
	canQueuePremove: () => boolean;
	isPromotionMove: (source: string, target: string) => boolean;
	isPremovePromotion: (piece: UiPiece, target: Square) => boolean;
	setPremoveQueue: React.Dispatch<React.SetStateAction<UiPremove[]>>;
	setPromotionRequest: React.Dispatch<React.SetStateAction<UiPromotionRequest>>;
};

export type GameEngineInfo = {
	myColor: GameColor;
	boardOrientation: "white" | "black";
	playerColor: Color;
	isMyGame: boolean;
	gameEnded: boolean;
	status: GameStatusName | null;
	winner: string | null;
};

export type GameEngineReturn = {
	state: GameEngineState;
	handlers: GameEngineHandlers;
	gameInfo: GameEngineInfo;
};

export function useGameEngine({
	gameFull,
	serverFen,
	serverTurn,
	serverHistory,
	user,
	isConnected,
	makeMove,
}: GameEngineConfig): GameEngineReturn {
	const [chess, setChess] = useState(() => new Chess(serverFen));
	const chessRef = useRef(chess);
	const [pendingUci, setPendingUci] = useState<string | null>(null);
	const [pendingIsPremove, setPendingIsPremove] = useState(false);
	const [premoveQueue, setPremoveQueue] = useState<UiPremove[]>([]);
	const [lastMoveSquares, setLastMoveSquares] = useState<{
		from: Square | null;
		to: Square | null;
	}>({ from: null, to: null });
	const [checkSquare, setCheckSquare] = useState<Square | null>(null);
	const [promotionRequest, setPromotionRequest] = useState<UiPromotionRequest>(null);

	// Derived game state
	const status = gameFull?.state?.status ?? null;
	const winner = gameFull?.state?.winner ?? null;
	const gameEnded = Boolean(status) && status !== GameStatusName.started;

	const myColor = getPlayerColor(gameFull, user);
	const boardOrientation = (myColor ?? GameColor.white) as "white" | "black";
	const playerColor: Color = boardOrientation === GameColor.white ? "w" : "b";
	const isMyGame = Boolean(gameFull && isPlayerInGame(gameFull, user));

	// Move permission checks
	const canPlayMove = useCallback(
		() =>
			isConnected &&
			!gameEnded &&
			isMyGame &&
			pendingUci == null &&
			chessRef.current.turn() === playerColor,
		[isConnected, gameEnded, isMyGame, pendingUci, playerColor],
	);

	const canQueuePremove = useCallback(
		() => isConnected && !gameEnded && isMyGame && chessRef.current.turn() !== playerColor,
		[isConnected, gameEnded, isMyGame, playerColor],
	);

	// Reset board to last known server state on error
	const rollbackToServer = useCallback(() => {
		setPendingUci(null);
		setPendingIsPremove(false);
		setPremoveQueue([]);
	}, []);

	// Execute a move optimistically, rollback on error
	const executeMove = useCallback(
		async (uci: string, isPremove = false) => {
			setPendingUci(uci);
			setPendingIsPremove(isPremove);
			try {
				await makeMove(uci);
			} catch (error) {
				console.error("Failed to send move:", error);
				rollbackToServer();
			}
		},
		[makeMove, rollbackToServer],
	);

	// Promotion move detection
	const isPromotionMove = useCallback((source: string, target: string): boolean => {
		const board = chessRef.current;
		const piece = board.get(source as Square);
		if (!piece || piece.type !== "p") return false;
		if (piece.color === "w" && target[1] === "8") return true;
		if (piece.color === "b" && target[1] === "1") return true;
		return false;
	}, []);

	// Check if a pawn move to target square is a premove promotion
	const isPremovePromotion = useCallback((piece: UiPiece, target: Square): boolean => {
		if (piece.type !== "p") return false;
		return (piece.color === "w" && target[1] === "8") || (piece.color === "b" && target[1] === "1");
	}, []);

	// Build board position = server + pending board + local premove overlay
	const { boardPosition, ghostPieces } = useMemo(() => {
		const baseBoard = boardFromChess(chess);
		let visualBoard: UiBoard;
		let ghosts: UiGhostPiece[] = [];

		if (premoveQueue.length > 0) {
			const result = applyPremoves(baseBoard, premoveQueue);
			visualBoard = result.board;
			ghosts = result.ghosts;
		} else {
			visualBoard = { ...baseBoard };
		}

		if (promotionRequest) {
			const { from, to, mode } = promotionRequest;
			const piece = visualBoard[from];
			if (piece) {
				visualBoard[to] = piece;
				delete visualBoard[from];
				if (mode === "premove") {
					ghosts.push({ square: from, piece });
				}
			}
		}

		const pos = boardToChessboardPosition(visualBoard);

		const shouldShowGhosts = premoveQueue.length > 0 || promotionRequest?.mode === "premove";
		return { boardPosition: pos, ghostPieces: shouldShowGhosts ? ghosts : [] };
	}, [chess, premoveQueue, promotionRequest]);

	const getVisualPieceAt = useCallback(
		(square: Square): UiPiece | null => {
			const entry = boardPosition[square];
			if (!entry) return null;
			return keyToPiece(entry.pieceType as UiPieceKey);
		},
		[boardPosition],
	);

	const ownsSquare = useCallback(
		(square: Square) => {
			const piece = getVisualPieceAt(square);
			if (!piece) return false;
			return piece.color === playerColor;
		},
		[getVisualPieceAt, playerColor],
	);

	// Rebuild chess position from serverFen + pending move
	useEffect(() => {
		const lastServerMove =
			serverHistory.length > 0 ? serverHistory[serverHistory.length - 1] : null;

		if (pendingUci && lastServerMove?.uci === pendingUci) {
			setPendingUci(null);
			setPendingIsPremove(false);
			setChess(new Chess(serverFen));
			return;
		}

		const next = new Chess(serverFen);

		if (!gameEnded && pendingUci) {
			try {
				const move = uciToMove(pendingUci);
				const result = next.move(move);
				if (!result) {
					console.warn(`Optimistic move '${pendingUci}' is illegal on serverFen.`);
					setPendingUci(null);
					setPendingIsPremove(false);
				}
			} catch (error) {
				console.warn(`Failed to apply pending move '${pendingUci}':`, error);
				setPendingUci(null);
				setPendingIsPremove(false);
			}
		} else if (gameEnded && pendingUci) {
			setPendingUci(null);
			setPendingIsPremove(false);
		}

		if (pendingUci) {
			const { from, to } = uciToMove(pendingUci);
			setLastMoveSquares({ from: from as Square, to: to as Square });
		} else if (serverHistory.length > 0) {
			const last = serverHistory[serverHistory.length - 1];
			setLastMoveSquares({ from: last.from as Square, to: last.to as Square });
		} else {
			setLastMoveSquares({ from: null, to: null });
		}

		setChess(next);
	}, [serverFen, pendingUci, gameEnded, serverHistory]);

	// Keep ref in sync, and update check highlight
	useEffect(() => {
		chessRef.current = chess;

		if (chess.isCheck()) {
			const uiBoard = boardFromChess(chess);
			setCheckSquare(findKingSquare(uiBoard, chess.turn()) ?? null);
		} else {
			setCheckSquare(null);
		}
	}, [chess]);

	// Send premoves when it becomes our turn according to the server state
	useEffect(() => {
		if (!gameFull) return;
		if (!isMyGame) return;
		if (!isConnected) return;
		if (gameEnded) return;
		if (!premoveQueue.length) return;
		if (pendingUci) return;

		if (serverTurn !== playerColor) return;

		const [next, ...rest] = premoveQueue;

		const serverBoard = new Chess(serverFen);

		let legal = false;
		try {
			const candidate = uciToMove(next.uci);
			const result = serverBoard.move(candidate);
			legal = Boolean(result);
		} catch {
			legal = false;
		}

		if (!legal) {
			setPremoveQueue([]);
			return;
		}

		setPremoveQueue(rest);
		void executeMove(next.uci, true);
	}, [
		gameFull,
		serverFen,
		serverTurn,
		isMyGame,
		isConnected,
		gameEnded,
		premoveQueue,
		pendingUci,
		playerColor,
		executeMove,
	]);

	// Clean up on game end
	useEffect(() => {
		if (!gameEnded) return;
		setPromotionRequest(null);
		setPendingUci(null);
		setPendingIsPremove(false);
		setPremoveQueue([]);
	}, [gameEnded]);

	const moveHistory = useMemo(() => {
		const serverSans = serverHistory.map((m) => m.san);
		const localSans = chess.history();
		return [...serverSans, ...localSans];
	}, [serverHistory, chess]);

	const showAnimations = !premoveQueue.length && !pendingIsPremove;

	return {
		state: {
			chess,
			position: boardPosition,
			ghostPieces,
			lastMoveSquares,
			checkSquare,
			premoveQueue,
			promotionRequest,
			showAnimations,
			moveHistory,
			pendingUci,
		},
		handlers: {
			executeMove,
			rollbackToServer,
			getVisualPieceAt,
			ownsSquare,
			canPlayMove,
			canQueuePremove,
			isPromotionMove,
			isPremovePromotion,
			setPremoveQueue,
			setPromotionRequest,
		},
		gameInfo: {
			myColor,
			boardOrientation,
			playerColor,
			isMyGame,
			gameEnded,
			status,
			winner,
		},
	};
}
