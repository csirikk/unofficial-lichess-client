/**
 * useBoard Hook
 *
 * Contains all board display state and interaction handlers. Handles live play and history viewing.
 */
import { useMemo } from "react";
import type { Move as ChessMove, Square } from "chess.js";
import type { UiGhostPiece, UiPremove, UiPromotionPiece, UiPromotionRequest } from "../model/chess";
import type { GameEngineState, GameEngineInfo } from "./useGameEngine";
import type { BoardInteractionState, BoardInteractionHandlers } from "./useBoardInteraction";

export type BoardViewModelConfig = {
	engineState: GameEngineState;
	interactionState: BoardInteractionState;
	interactionHandlers: BoardInteractionHandlers;
	gameInfo: GameEngineInfo;
	isViewingHistory: boolean;
	displayPosition: Record<string, { pieceType: string }>;
	viewedLastMove: { from: Square | null; to: Square | null };
	onInteract: () => void;
};

export type BoardDisplayState = {
	position: Record<string, { pieceType: string }>;
	boardOrientation: "white" | "black";
	ghostPieces: UiGhostPiece[];
	selectedSquare: Square | null;
	lastMoveSquares: { from: Square | null; to: Square | null };
	checkSquare: Square | null;
	legalMoves: ChessMove[];
	premoveQueue: UiPremove[];
	promotionRequest: UiPromotionRequest;
	showAnimations: boolean;
	rightClickedSquares: Record<string, boolean>;
};

export type BoardHandlers = {
	onSquareClick: (square: string) => void;
	onPieceClick: (square: string) => void;
	onPieceDrag: (square: string) => void;
	canDragPiece: (square: string) => boolean;
	onPieceDrop: (sourceSquare: string, targetSquare: string | null) => boolean;
	onPromotionChoice: (piece: UiPromotionPiece) => void;
	onCancelPromotion: () => void;
	onRightClick: (square: string) => void;
};

export type BoardViewModel = {
	displayState: BoardDisplayState;
	handlers: BoardHandlers;
	mode: "live" | "history";
};

export function useBoard({
	engineState,
	interactionState,
	interactionHandlers,
	gameInfo,
	isViewingHistory,
	displayPosition,
	viewedLastMove,
	onInteract,
}: BoardViewModelConfig): BoardViewModel {
	const displayState = useMemo<BoardDisplayState>(
		() => ({
			position: isViewingHistory ? displayPosition : engineState.position,
			boardOrientation: gameInfo.boardOrientation,
			ghostPieces: isViewingHistory ? [] : engineState.ghostPieces,
			selectedSquare: isViewingHistory ? null : interactionState.selectedSquare,
			lastMoveSquares: isViewingHistory ? viewedLastMove : engineState.lastMoveSquares,
			checkSquare: isViewingHistory ? null : engineState.checkSquare,
			legalMoves: isViewingHistory ? [] : interactionState.legalMoves,
			premoveQueue: isViewingHistory ? [] : engineState.premoveQueue,
			promotionRequest: isViewingHistory ? null : engineState.promotionRequest,
			showAnimations: engineState.showAnimations,
			rightClickedSquares: isViewingHistory ? {} : interactionState.rightClickedSquares,
		}),
		[
			isViewingHistory,
			displayPosition,
			engineState.position,
			engineState.ghostPieces,
			engineState.lastMoveSquares,
			engineState.checkSquare,
			engineState.premoveQueue,
			engineState.promotionRequest,
			engineState.showAnimations,
			interactionState.selectedSquare,
			interactionState.legalMoves,
			interactionState.rightClickedSquares,
			gameInfo.boardOrientation,
			viewedLastMove,
		],
	);

	const handlers = useMemo<BoardHandlers>(
		() => ({
			onSquareClick: isViewingHistory ? onInteract : interactionHandlers.handleBoardClick,
			onPieceClick: isViewingHistory ? onInteract : interactionHandlers.handleBoardClick,
			onPieceDrag: isViewingHistory ? () => {} : interactionHandlers.handlePieceDrag,
			canDragPiece: isViewingHistory ? () => false : interactionHandlers.canDragPiece,
			onPieceDrop: isViewingHistory ? () => false : interactionHandlers.onPieceDrop,
			onPromotionChoice: interactionHandlers.handlePromotionChoice,
			onCancelPromotion: () => interactionHandlers.cancelPromotion(),
			onRightClick: (sq: string) =>
				!isViewingHistory && interactionHandlers.handleRightClick(sq as Square),
		}),
		[isViewingHistory, onInteract, interactionHandlers],
	);

	const mode = useMemo<"live" | "history">(
		() => (isViewingHistory ? "history" : "live"),
		[isViewingHistory],
	);

	return {
		displayState,
		handlers,
		mode,
	};
}
