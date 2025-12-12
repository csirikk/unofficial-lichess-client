/**
 * useGameEngine Hook
 *
 * Manages the truth of the game:
 * - Chess.js instance
 * - Server synchronization
 * - Optimistic updates
 * - Move execution (including premoves)
 */
import { Chess, type Square, type Piece } from "chess.js";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type Dispatch,
	type SetStateAction,
} from "react";
import { GameColor as Color } from "../../../generated/types/gameColor";
import { GameStatusName } from "../../../generated/types/gameStatusName";
import type { GameFullEvent } from "../../../generated/types/gameFullEvent";
import type { UserExtended } from "../../../generated/types/userExtended";
import {
	type PieceMap,
	type GhostPieceModel,
	type PieceMapKey,
	type PremoveModel,
	type PromotionRequestModel,
	applyPremoves,
	pieceMapFromChess,
	pieceMapToChessboard,
	chessColorToGameColor,
	findKingSquare,
	getPlayerColor,
	isPlayerInGame,
	keyToPiece,
	uciToMove,
	type MoveModel,
} from "../model/chess";

export type GameEngineConfig = {
	gameFull: GameFullEvent | null;
	serverFen: string;
	serverTurn: Color;
	serverHistory: MoveModel[];
	user: UserExtended | null;
	isConnected: boolean;
	makeMove: (uci: string) => Promise<unknown>;
	onPremoveSound: (move: MoveModel) => void;
};

export type GameEngineState = {
	chess: Chess;
	position: Record<string, { pieceType: string }>;
	ghostPieces: GhostPieceModel[];
	lastMoveSquares: { from: Square | null; to: Square | null };
	checkSquare: Square | null;
	premoveQueue: PremoveModel[];
	promotionRequest: PromotionRequestModel;
	showAnimations: boolean;
	moveHistory: string[];
	pendingUci: string | null;
	serverHistory: MoveModel[];
};

export type GameEngineHandlers = {
	executeMove: (uci: string, isPremove?: boolean) => Promise<void>;
	rollbackToServer: () => void;
	getVisualPieceAt: (square: Square) => Piece | null;
	ownsSquare: (square: Square) => boolean;
	canPlayMove: () => boolean;
	canQueuePremove: () => boolean;
	isPromotionMove: (source: string, target: string) => boolean;
	isPremovePromotion: (piece: Piece, target: Square) => boolean;
	setPremoveQueue: Dispatch<SetStateAction<PremoveModel[]>>;
	setPromotionRequest: Dispatch<SetStateAction<PromotionRequestModel>>;
};

export type GameEngineInfo = {
	myColor: Color;
	boardOrientation: Color;
	playerColor: Color;
	isMyGame: boolean;
	isGameEnded: boolean;
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
	onPremoveSound,
}: GameEngineConfig): GameEngineReturn {
	const [chess, setChess] = useState(() => new Chess(serverFen));
	const chessRef = useRef(chess);
	const [pendingUci, setPendingUci] = useState<string | null>(null);
	const [pendingIsPremove, setPendingIsPremove] = useState(false);
	const [premoveQueue, setPremoveQueue] = useState<PremoveModel[]>([]);
	const [lastMoveSquares, setLastMoveSquares] = useState<{
		from: Square | null;
		to: Square | null;
	}>({ from: null, to: null });
	const [checkSquare, setCheckSquare] = useState<Square | null>(null);
	const [promotionRequest, setPromotionRequest] = useState<PromotionRequestModel>(null);

	// Derived game state
	const status = gameFull?.state?.status ?? null;
	const winner = gameFull?.state?.winner ?? null;
	const isGameEnded = Boolean(status) && status !== GameStatusName.started;

	const myColor = getPlayerColor(gameFull, user);
	const boardOrientation = myColor ?? Color.white;
	const playerColor: Color = boardOrientation;
	const isMyGame = Boolean(gameFull && isPlayerInGame(gameFull, user));

	// Move permission checks
	const canPlayMove = useCallback(
		() =>
			isConnected &&
			!isGameEnded &&
			isMyGame &&
			pendingUci == null &&
			chessColorToGameColor(chessRef.current.turn()) === playerColor,
		[isConnected, isGameEnded, isMyGame, pendingUci, playerColor],
	);

	const canQueuePremove = useCallback(
		() =>
			isConnected &&
			!isGameEnded &&
			isMyGame &&
			chessColorToGameColor(chessRef.current.turn()) !== playerColor,
		[isConnected, isGameEnded, isMyGame, playerColor],
	);

	// Reset board to last known server state on error
	const rollbackToServer = useCallback(() => {
		setPendingUci(null);
		setPendingIsPremove(false);
		setPremoveQueue([]);
		setPromotionRequest((prev) => (prev?.mode === "premove" ? null : prev));
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
	const isPremovePromotion = useCallback((piece: Piece, target: Square): boolean => {
		if (piece.type !== "p") return false;
		return (piece.color === "w" && target[1] === "8") || (piece.color === "b" && target[1] === "1");
	}, []);

	// Build board position = server + pending board + local premove overlay
	const { boardPosition, ghostPieces } = useMemo(() => {
		const baseBoard = pieceMapFromChess(chess);
		let visualBoard: PieceMap;
		let ghosts: GhostPieceModel[] = [];

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

		const pos = pieceMapToChessboard(visualBoard);

		const shouldShowGhosts = premoveQueue.length > 0 || promotionRequest?.mode === "premove";
		return { boardPosition: pos, ghostPieces: shouldShowGhosts ? ghosts : [] };
	}, [chess, premoveQueue, promotionRequest]);

	const getVisualPieceAt = useCallback(
		(square: Square): Piece | null => {
			const entry = boardPosition[square];
			if (!entry) return null;
			return keyToPiece(entry.pieceType as PieceMapKey);
		},
		[boardPosition],
	);

	const ownsSquare = useCallback(
		(square: Square) => {
			const piece = getVisualPieceAt(square);
			if (!piece) return false;
			return chessColorToGameColor(piece.color) === playerColor;
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

		if (!isGameEnded && pendingUci) {
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
		} else if (isGameEnded && pendingUci) {
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
	}, [serverFen, pendingUci, isGameEnded, serverHistory]);

	// Keep ref in sync, and update check highlight
	useEffect(() => {
		chessRef.current = chess;

		if (chess.isCheck()) {
			const pieceMap = pieceMapFromChess(chess);
			setCheckSquare(findKingSquare(pieceMap, chessColorToGameColor(chess.turn())) ?? null);
		} else {
			setCheckSquare(null);
		}
	}, [chess]);

	const processPremoveQueue = useCallback(() => {
		if (!gameFull || !isMyGame || !isConnected || isGameEnded) return;
		if (!premoveQueue.length) return;
		if (pendingUci) return; // Wait for pending move to resolve

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
			if (promotionRequest?.mode === "premove") {
				setPromotionRequest(null);
			}
			return;
		}

		setPremoveQueue(rest);

		try {
			const testBoard = new Chess(serverFen);
			const moveResult = testBoard.move(uciToMove(next.uci));
			if (moveResult) {
				const moveData: MoveModel = {
					...moveResult,
					uci: next.uci,
					fen: testBoard.fen(),
					check: testBoard.isCheck(),
				};
				onPremoveSound(moveData);
			}
		} catch (e) {
			console.warn("Error calculating premove sound:", e);
		}

		void executeMove(next.uci, true);
	}, [
		serverTurn,
		premoveQueue,
		pendingUci,
		gameFull,
		isMyGame,
		isConnected,
		isGameEnded,
		serverFen,
		playerColor,
		promotionRequest,
		executeMove,
		onPremoveSound,
	]);

	useEffect(() => {
		processPremoveQueue();
	}, [processPremoveQueue]);

	// Clean up on game end
	useEffect(() => {
		if (!isGameEnded) return;
		setPromotionRequest(null);
		setPendingUci(null);
		setPendingIsPremove(false);
		setPremoveQueue([]);
	}, [isGameEnded]);

	const moveHistory = useMemo(() => {
		const serverMoves = serverHistory
			.map((m) => m.san)
			.filter((s): s is string => typeof s === "string");

		const localMoves = chess.history();
		const unsyncedLocalMoves =
			localMoves.length > serverMoves.length ? localMoves.slice(serverMoves.length) : [];

		let pendingMovess: string[] = [];
		if (pendingUci && unsyncedLocalMoves.length === 0) {
			try {
				const test = new Chess(serverFen);
				const result = test.move(uciToMove(pendingUci));
				if (result && typeof result.san === "string") {
					const pendingSan = result.san;
					const lastServerSan = serverMoves.length ? serverMoves[serverMoves.length - 1] : null;
					if (pendingSan !== lastServerSan) {
						pendingMovess = [pendingSan];
					}
				}
			} catch {}
		}

		return [...serverMoves, ...unsyncedLocalMoves, ...pendingMovess];
	}, [serverHistory, chess, pendingUci, serverFen]);

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
			serverHistory,
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
			isGameEnded,
			status,
			winner,
		},
	};
}
