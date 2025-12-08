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
import { useCallback, useEffect, useMemo, useState } from "react";
import { type UiPromotionPiece, isFeasiblePremove, moveToUci } from "../model/chess";
import type { GameEngineHandlers, GameEngineInfo, GameEngineState } from "./useGameEngine";

export type BoardInteractionConfig = {
	engineState: GameEngineState;
	engineHandlers: GameEngineHandlers;
	gameInfo: GameEngineInfo;
};

export type BoardInteractionState = {
	selectedSquare: Square | null;
	legalMoves: ChessMove[];
	rightClickedSquares: Record<string, boolean>;
};

export type BoardInteractionHandlers = {
	handleMoveIntent: (from: Square, to: Square, promotion?: UiPromotionPiece) => boolean;
	handlePromotionChoice: (piece: UiPromotionPiece) => void;
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
}: BoardInteractionConfig): BoardInteractionReturn {
	const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
	const [rightClickedSquares, setRightClickedSquares] = useState<Record<string, boolean>>({});

	const { chess, premoveQueue, promotionRequest, pendingUci } = engineState;

	const {
		executeMove,
		getVisualPieceAt,
		ownsSquare,
		canPlayMove,
		canQueuePremove,
		isPromotionMove,
		isPremovePromotion,
		setPremoveQueue,
		setPromotionRequest,
	} = engineHandlers;

	const { isMyGame, gameEnded, playerColor } = gameInfo;

	// General move intent handler
	const handleMoveIntent = useCallback(
		(from: Square, to: Square, promotion?: UiPromotionPiece): boolean => {
			if (!isMyGame || gameEnded) return false;

			const isMyTurn = canPlayMove();
			const canPremove = canQueuePremove();

			if (isMyTurn) {
				if (!promotion && isPromotionMove(from, to)) {
					const piece = chess.get(from);
					if (!piece) return false;
					setPromotionRequest({ from, to, color: piece.color, mode: "live" });
					setSelectedSquare(null);
					return true;
				}

				try {
					const test = new Chess(chess.fen());
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
			chess,
			setPremoveQueue,
			setPromotionRequest,
		],
	);

	const handlePromotionChoice = useCallback(
		(piece: UiPromotionPiece) => {
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
		setSelectedSquare(null);
		setRightClickedSquares({});
	}, []);

	const handleRightClick = useCallback(
		(square: Square) => {
			// Clear premoves if they exist
			if (premoveQueue.length > 0 || pendingUci) {
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
		[premoveQueue, pendingUci, setPremoveQueue],
	);

	// Keep ref in sync, and update selection validity
	useEffect(() => {
		if (selectedSquare) {
			const piece = chess.get(selectedSquare);
			if (!piece || piece.color !== playerColor) {
				setSelectedSquare(null);
			}
		}

		setRightClickedSquares({});
	}, [chess, playerColor, selectedSquare]);

	// Clean up on game end
	useEffect(() => {
		if (!gameEnded) return;
		setSelectedSquare(null);
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

	const cancelPromotion = useCallback(() => {
		setPromotionRequest(null);
		setSelectedSquare(null);
	}, [setPromotionRequest]);

	return {
		state: {
			selectedSquare,
			legalMoves,
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
			handleRightClick,
			cancelPromotion,
		},
	};
}
