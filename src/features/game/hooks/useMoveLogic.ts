/**
 * useMoveLogic Hook
 *
 * Manages all move-related logic:
 * - Move validation and execution
 * - Premove queue management
 * - Optimistic updates
 * - Rollback
 * - Promotion handling
 */
import { Chess, type Move as ChessMove, type Square, type Color } from "chess.js";
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
	type UiPromotionPiece,
	type UiPromotionRequest,
	applyPremoves,
	boardFromChess,
	boardToChessboardPosition,
	findKingSquare,
	getPlayerColor,
	isFeasiblePremove,
	isPlayerInGame,
	keyToPiece,
	moveToUci,
	uciToMove,
	type UiMove,
} from "../logic/chess";

export type MoveLogicConfig = {
	gameId: string | null;
	gameFull: GameFullEvent | null;
	serverFen: string;
	serverTurn: Color;
	serverHistory: UiMove[];
	user: UserExtended | null;
	isConnected: boolean;
	makeMove: (uci: string) => Promise<unknown>;
};

export type BoardState = {
	chess: Chess;
	position: Record<string, { pieceType: string }>;
	ghostPieces: UiGhostPiece[];
	selectedSquare: Square | null;
	lastMoveSquares: { from: Square | null; to: Square | null };
	checkSquare: Square | null;
	legalMoves: ChessMove[];
	premoveQueue: UiPremove[];
	promotionRequest: UiPromotionRequest;
	showAnimations: boolean;
	moveHistory: string[];
	rightClickedSquares: Record<string, boolean>;
};

export type MoveHandlers = {
	handleMoveIntent: (from: Square, to: Square, promotion?: UiPromotionPiece) => boolean;
	handlePromotionChoice: (piece: UiPromotionPiece) => void;
	handleSelectSquare: (square: Square | null) => void;
	handleBoardClick: (square: string | null | undefined) => void;
	handlePieceDrag: (square: string | null | undefined) => void;
	canDragPiece: (square: string | null | undefined) => boolean;
	onPieceDrop: (sourceSquare: string, targetSquare: string | null) => boolean;
	resetBoard: () => void;
	getVisualPieceAt: (square: Square) => UiPiece | null;
	ownsSquare: (square: Square) => boolean;
	handleRightClick: (square: Square) => void;
};

export type MoveLogicReturn = {
	boardState: BoardState;
	handlers: MoveHandlers;
	gameInfo: {
		myColor: GameColor;
		boardOrientation: "white" | "black";
		playerColor: Color;
		isMyGame: boolean;
		gameEnded: boolean;
		status: GameStatusName | null;
		winner: string | null;
	};
	pendingUci: string | null;
};

export function useMoveLogic({
	gameFull,
	serverFen,
	serverTurn,
	serverHistory,
	user,
	isConnected,
	makeMove,
}: MoveLogicConfig): MoveLogicReturn {
	const [chess, setChess] = useState(() => new Chess(serverFen));
	const chessRef = useRef(chess);
	const [pendingUci, setPendingUci] = useState<string | null>(null);
	const [pendingIsPremove, setPendingIsPremove] = useState(false);
	const [premoveQueue, setPremoveQueue] = useState<UiPremove[]>([]);
	const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
	const [lastMoveSquares, setLastMoveSquares] = useState<{
		from: Square | null;
		to: Square | null;
	}>({ from: null, to: null });
	const [checkSquare, setCheckSquare] = useState<Square | null>(null);
	const [promotionRequest, setPromotionRequest] = useState<UiPromotionRequest>(null);
	const [rightClickedSquares, setRightClickedSquares] = useState<Record<string, boolean>>({});

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
		// chess will update via useEffect
	}, []);

	// Execute a move optimistically, rollback on error
	const executeMove = useCallback(
		async (uci: string, isPremove = false) => {
			setPendingUci(uci);
			setPendingIsPremove(isPremove);
			setSelectedSquare(null);
			try {
				await makeMove(uci);
			} catch (err) {
				console.error("Failed to send move:", err);
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

	// General move intent handler
	const handleMoveIntent = useCallback(
		(from: Square, to: Square, promotion?: UiPromotionPiece): boolean => {
			if (!isMyGame || gameEnded) return false;

			const board = chessRef.current;
			const isMyTurn = canPlayMove();
			const canPremove = canQueuePremove();

			if (isMyTurn) {
				if (!promotion && isPromotionMove(from, to)) {
					const piece = board.get(from);
					if (!piece) return false;
					setPromotionRequest({ from, to, color: piece.color, mode: "live" });
					setSelectedSquare(null);
					return true;
				}

				try {
					const test = new Chess(board.fen());
					const move = test.move({ from, to, promotion });
					if (!move) return false;

					const uci = moveToUci({ from, to, promotion: move.promotion });
					void executeMove(uci, false);
					return true;
				} catch {
					return false;
				}
			}

			if (canPremove) {
				let visualPiece = getVisualPieceAt(from);

				if (!visualPiece && promotionRequest?.from === from && promotionRequest?.to === to) {
					visualPiece = getVisualPieceAt(to);
				}

				if (!visualPiece || visualPiece.color !== playerColor) return false;
				if (!isFeasiblePremove(visualPiece, from, to)) return false;

				if (!promotion && isPremovePromotion(visualPiece, to)) {
					setPromotionRequest({ from, to, color: visualPiece.color, mode: "premove" });
					setSelectedSquare(null);
					return true;
				}

				const uci = moveToUci({ from, to, promotion });
				setPremoveQueue((prev) => [...prev, { uci, from, to, promotion }]);
				setSelectedSquare(null);
				return true;
			}

			return false;
		},
		[
			isMyGame,
			gameEnded,
			canPlayMove,
			canQueuePremove,
			isPromotionMove,
			isPremovePromotion,
			getVisualPieceAt,
			playerColor,
			executeMove,
			promotionRequest,
		],
	);

	const handlePromotionChoice = useCallback(
		(piece: UiPromotionPiece) => {
			if (!promotionRequest) return;
			const { from, to } = promotionRequest;
			setPromotionRequest(null);
			handleMoveIntent(from as Square, to as Square, piece);
		},
		[promotionRequest, handleMoveIntent],
	);

	const handleSelectSquare = useCallback(
		(square: Square | null) => {
			if (!square) {
				setSelectedSquare(null);
				return;
			}
			if (selectedSquare === square) {
				setSelectedSquare(null);
				return;
			}
			if (ownsSquare(square)) {
				setSelectedSquare(square);
			} else {
				setSelectedSquare(null);
			}
		},
		[selectedSquare, ownsSquare],
	);

	const handleBoardClick = useCallback(
		(square: string | null | undefined) => {
			if (!square) return;
			if (!isMyGame || gameEnded) return;

			const targetSquare = square as Square;

			if (!selectedSquare) {
				handleSelectSquare(targetSquare);
				return;
			}

			if (targetSquare === selectedSquare || ownsSquare(targetSquare)) {
				handleSelectSquare(targetSquare);
				return;
			}

			const sourceSquare = selectedSquare;
			setSelectedSquare(null);
			handleMoveIntent(sourceSquare, targetSquare);
		},
		[isMyGame, gameEnded, selectedSquare, handleSelectSquare, ownsSquare, handleMoveIntent],
	);

	const handlePieceDrag = useCallback(
		(square: string | null | undefined) => {
			if (!square) return;
			if (!isMyGame || gameEnded) return;
			const next = square as Square;
			if (!ownsSquare(next)) return;
			if (selectedSquare !== next) {
				setSelectedSquare(next);
			}
		},
		[isMyGame, gameEnded, ownsSquare, selectedSquare],
	);

	const canDragPiece = useCallback(
		(square: string | null | undefined): boolean => {
			if (!square) return false;
			if (!isMyGame || gameEnded) return false;
			return ownsSquare(square as Square);
		},
		[isMyGame, gameEnded, ownsSquare],
	);

	const onPieceDrop = useCallback(
		(sourceSquare: string, targetSquare: string | null): boolean => {
			if (!targetSquare) return false;
			return handleMoveIntent(sourceSquare as Square, targetSquare as Square);
		},
		[handleMoveIntent],
	);

	const resetBoard = useCallback(() => {
		setChess(new Chess());
		setPendingUci(null);
		setPendingIsPremove(false);
		setPremoveQueue([]);
		setSelectedSquare(null);
		setLastMoveSquares({ from: null, to: null });
		setCheckSquare(null);
		setPromotionRequest(null);
		setRightClickedSquares({});
	}, []);

	const handleRightClick = useCallback(
		(square: Square) => {
			// Clear premoves if they exist
			if (premoveQueue.length > 0 || pendingUci) {
				setPendingUci(null);
				setPendingIsPremove(false);
				setPremoveQueue([]);
				return;
			}

			// Toggle highlight
			setRightClickedSquares((prev) => {
				const newStyles = { ...prev };
				if (newStyles[square]) {
					delete newStyles[square];
				} else {
					newStyles[square] = true;
				}
				return newStyles;
			});
		},
		[premoveQueue, pendingUci],
	);

	// Rebuild chess position from serverFen + pending move
	useEffect(() => {
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

	// Keep ref in sync, and update check highlight / selection validity
	useEffect(() => {
		chessRef.current = chess;

		if (selectedSquare) {
			const piece = chess.get(selectedSquare);
			if (!piece || piece.color !== playerColor) {
				setSelectedSquare(null);
			}
		}

		if (chess.isCheck()) {
			const uiBoard = boardFromChess(chess);
			setCheckSquare(findKingSquare(uiBoard, chess.turn()) ?? null);
		} else {
			setCheckSquare(null);
		}

		setRightClickedSquares({});
	}, [chess, playerColor, selectedSquare]);

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
			setSelectedSquare(null);
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
		setSelectedSquare(null);
		setPromotionRequest(null);
		setPendingUci(null);
		setPendingIsPremove(false);
		setPremoveQueue([]);
	}, [gameEnded]);

	// Legal moves for current selection
	const legalMoves = useMemo<ChessMove[]>(() => {
		if (!selectedSquare) return [];
		try {
			return chess.moves({ square: selectedSquare, verbose: true }) as ChessMove[];
		} catch {
			return [];
		}
	}, [chess, selectedSquare]);

	const moveHistory = useMemo(() => {
		const serverSans = serverHistory.map((m) => m.san);
		const localSans = chess.history();
		return [...serverSans, ...localSans];
	}, [serverHistory, chess]);

	const showAnimations = !premoveQueue.length && !pendingIsPremove;

	return {
		boardState: {
			chess,
			position: boardPosition,
			ghostPieces,
			selectedSquare,
			lastMoveSquares,
			checkSquare,
			legalMoves,
			premoveQueue,
			promotionRequest,
			showAnimations,
			moveHistory,
			rightClickedSquares,
		},
		handlers: {
			handleMoveIntent,
			handlePromotionChoice,
			handleSelectSquare,
			handleBoardClick,
			handlePieceDrag,
			canDragPiece,
			onPieceDrop,
			resetBoard,
			getVisualPieceAt,
			ownsSquare,
			handleRightClick,
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
		pendingUci,
	};
}
