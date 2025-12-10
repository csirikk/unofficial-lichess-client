/**
 * useBoardInteraction Hook
 *
 * Handles interaction with the board:
 * - Clicks and drags
 * - Square selection
 * - Right-clicks for highlights
 * - Promotion modal
 */
import { Chess, type Move as ChessMove, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type PromotionPieceModel,
	isFeasiblePremove,
	moveToUci,
	type MoveModel,
	chessColorToGameColor,
} from "../model/chess";
import { playSound } from "../model/sounds";
import { isPremoveEnabled, isAutoQueenEnabled } from "../model/preferences";
import type { GameEngineHandlers, GameEngineInfo, GameEngineState } from "./useGameEngine";

export type BoardInteractionConfig = {
	engineState: GameEngineState;
	engineHandlers: GameEngineHandlers;
	gameInfo: GameEngineInfo;
	playMoveSound: (move: MoveModel) => void;
};

export type BoardInteractionState = {
	selectedSquare: Square | null;
	legalMoves: ChessMove[];
	rightClickedSquares: Record<string, boolean>;
	takebackSquares: Array<{ from: string; to: string }>;
};

export type BoardInteractionHandlers = {
	handleMoveIntent: (from: Square, to: Square, promotion?: PromotionPieceModel) => boolean;
	handlePromotionChoice: (piece: PromotionPieceModel) => void;
	handleSelectSquare: (square: Square | null) => void;
	handleBoardClick: (square: string | null | undefined) => void;
	handlePieceDrag: (square: string | null | undefined) => void;
	canDragPiece: (square: string | null | undefined) => boolean;
	onPieceDrop: (sourceSquare: string, targetSquare: string | null) => boolean;
	resetBoard: () => void;
	handleRightClick: (square: Square) => void;
	cancelPromotion: () => void;
};

export type BoardInteractionReturn = {
	state: BoardInteractionState;
	handlers: BoardInteractionHandlers;
};

export function useBoardInteraction({
	engineState,
	engineHandlers,
	gameInfo,
	playMoveSound,
}: BoardInteractionConfig): BoardInteractionReturn {
	const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
	const [rightClickedSquares, setRightClickedSquares] = useState<Record<string, boolean>>({});
	const [takebackSquares, setTakebackSquares] = useState<Array<{ from: string; to: string }>>([]);

	const previousHistoryRef = useRef<MoveModel[] | null>(null);

	const { chess, premoveQueue, promotionRequest, pendingUci } = engineState;

	const {
		executeMove,
		getVisualPieceAt,
		ownsSquare,
		isPromotionMove,
		isPremovePromotion,
		setPremoveQueue,
		setPromotionRequest,
	} = engineHandlers;

	const { isMyGame, isGameEnded, playerColor } = gameInfo;

	// General move intent handler
	const handleMoveIntent = useCallback(
		(from: Square, to: Square, promotion?: PromotionPieceModel): boolean => {
			if (!isMyGame || isGameEnded) return false;

			const currentTurn = chessColorToGameColor(chess.turn());
			const isMyTurn = currentTurn === playerColor;
			const canPremove = !isMyTurn && isPremoveEnabled();

			if (isMyTurn) {
				if (!promotion && isPromotionMove(from, to)) {
					if (isAutoQueenEnabled()) {
						promotion = "q";
					} else {
						const piece = chess.get(from);
						if (!piece) return false;
						setPromotionRequest({
							from,
							to,
							color: chessColorToGameColor(piece.color),
							mode: "live",
						});
						setSelectedSquare(null);
						return true;
					}
				}

				try {
					const test = new Chess(chess.fen());
					const move = test.move({ from, to, promotion });
					if (!move) return false;

					const uci = moveToUci({ from, to, promotion: move.promotion });

					playMoveSound({
						...move,
						uci,
						fen: test.fen(),
						check: test.isCheck(),
					});
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

				if (!visualPiece || chessColorToGameColor(visualPiece.color) !== playerColor) return false;
				if (!isFeasiblePremove(visualPiece, from, to)) return false;

				if (!promotion && isPremovePromotion(visualPiece, to)) {
					if (isAutoQueenEnabled()) {
						promotion = "q";
					} else {
						setPromotionRequest({
							from,
							to,
							color: chessColorToGameColor(visualPiece.color),
							mode: "premove",
						});
						setSelectedSquare(null);
						return true;
					}
				}

				const uci = moveToUci({ from, to, promotion });
				setPremoveQueue((prev) => [...prev, { uci, from, to, promotion }]);
				playSound("premove");

				setSelectedSquare(null);
				return true;
			}

			return false;
		},
		[
			isMyGame,
			isGameEnded,
			isPromotionMove,
			isPremovePromotion,
			getVisualPieceAt,
			playerColor,
			executeMove,
			promotionRequest,
			chess,
			setPremoveQueue,
			setPromotionRequest,
			playMoveSound,
		],
	);

	const handlePromotionChoice = useCallback(
		(piece: PromotionPieceModel) => {
			if (!promotionRequest) return;
			const { from, to } = promotionRequest;
			setPromotionRequest(null);
			handleMoveIntent(from as Square, to as Square, piece);
		},
		[promotionRequest, handleMoveIntent, setPromotionRequest],
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
			setRightClickedSquares({});

			if (!isMyGame || isGameEnded) return;

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
		[isMyGame, isGameEnded, selectedSquare, handleSelectSquare, ownsSquare, handleMoveIntent],
	);

	const handlePieceDrag = useCallback(
		(square: string | null | undefined) => {
			if (!square) return;
			if (!isMyGame || isGameEnded) return;
			const next = square as Square;
			if (!ownsSquare(next)) return;
			if (selectedSquare !== next) {
				setSelectedSquare(next);
			}
		},
		[isMyGame, isGameEnded, ownsSquare, selectedSquare],
	);

	const canDragPiece = useCallback(
		(square: string | null | undefined): boolean => {
			if (!square) return false;
			if (!isMyGame || isGameEnded) return false;
			return ownsSquare(square as Square);
		},
		[isMyGame, isGameEnded, ownsSquare],
	);

	const onPieceDrop = useCallback(
		(sourceSquare: string, targetSquare: string | null): boolean => {
			if (!targetSquare) return false;
			const returnValue = handleMoveIntent(sourceSquare as Square, targetSquare as Square);
			if (returnValue) setTakebackSquares([]);
			return returnValue;
		},
		[handleMoveIntent],
	);

	const resetBoard = useCallback(() => {
		setSelectedSquare(null);
		setTakebackSquares([]);
		setRightClickedSquares({});
	}, []);

	const handleRightClick = useCallback(
		(square: Square) => {
			// Clear premoves if they exist
			if (premoveQueue.length > 0 || pendingUci) {
				setPremoveQueue([]);
				if (promotionRequest?.mode === "premove") {
					setPromotionRequest(null);
				}
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
		[premoveQueue, pendingUci, promotionRequest, setPremoveQueue, setPromotionRequest],
	);

	// Keep ref in sync, and update selection validity
	useEffect(() => {
		if (selectedSquare) {
			const piece = chess.get(selectedSquare);
			if (!piece || chessColorToGameColor(piece.color) !== playerColor) {
				setSelectedSquare(null);
			}
		}

		setRightClickedSquares({});
	}, [chess, playerColor, selectedSquare]);

	// Detect takebacks
	useEffect(() => {
		const serverHistory = engineState.serverHistory ?? [];

		if (
			serverHistory.length > 0 &&
			previousHistoryRef.current &&
			previousHistoryRef.current.length > serverHistory.length
		) {
			const squares: Array<{ from: string; to: string }> = [];
			for (let i = serverHistory.length; i < previousHistoryRef.current.length; i++) {
				const takenBackMove = previousHistoryRef.current[i];
				if (takenBackMove) {
					squares.push({ from: takenBackMove.from as string, to: takenBackMove.to as string });
				}
			}
			if (squares.length > 0) {
				setTakebackSquares(squares);
			}
		} else if (serverHistory.length > (previousHistoryRef.current?.length ?? 0)) {
			// Clear takebacks on new move
			setTakebackSquares([]);
		}

		previousHistoryRef.current = serverHistory;
	}, [engineState.serverHistory]);

	// Clean up on game end
	useEffect(() => {
		if (!isGameEnded) return;
		setSelectedSquare(null);
	}, [isGameEnded]);

	// Legal moves for current selection
	const legalMoves = useMemo<ChessMove[]>(() => {
		if (!selectedSquare) return [];
		try {
			return chess.moves({ square: selectedSquare, verbose: true }) as ChessMove[];
		} catch {
			return [];
		}
	}, [chess, selectedSquare]);

	const cancelPromotion = useCallback(() => {
		setPromotionRequest(null);
		setSelectedSquare(null);
	}, [setPromotionRequest]);

	return {
		state: {
			selectedSquare,
			legalMoves,
			rightClickedSquares,
			takebackSquares,
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
			handleRightClick,
			cancelPromotion,
		},
	};
}
