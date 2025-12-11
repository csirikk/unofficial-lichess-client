/**
 * useBoard Hook
 *
 * Contains all board display state and interaction handlers. Handles live play and history viewing.
 */
import { useMemo } from "react";
import type { Move as ChessMove, Square } from "chess.js";
import type {
	GhostPieceModel,
	PremoveModel,
	PromotionPieceModel,
	PromotionRequestModel,
} from "../model/chess";
import type { GameEngineState, GameEngineInfo } from "./useGameEngine";
import type { BoardInteractionState, BoardInteractionHandlers } from "./useBoardInteraction";
import type { GameColor as Color } from "../../../generated/types/gameColor";

export type BoardViewModelConfig = {
	engineState: GameEngineState;
	interactionState: BoardInteractionState;
	interactionHandlers: BoardInteractionHandlers;
	gameInfo: GameEngineInfo;
	isViewingHistory: boolean;
	displayPosition: Record<string, { pieceType: string }>;
	viewedLastMove: { from: Square | null; to: Square | null };
	takebackSquares: Array<{ from: string; to: string }>;
	onInteract: () => void;
};

export type BoardDisplayState = {
	position: Record<string, { pieceType: string }>;
	boardOrientation: Color;
	ghostPieces: GhostPieceModel[];
	selectedSquare: Square | null;
	lastMoveSquares: { from: Square | null; to: Square | null };
	checkSquare: Square | null;
	legalMoves: ChessMove[];
	premoveQueue: PremoveModel[];
	promotionRequest: PromotionRequestModel;
	showAnimations: boolean;
	rightClickedSquares: Record<string, boolean>;
	takebackSquares: Array<{ from: Square; to: Square }>;
	isDraggable: boolean;
};

export type BoardHandlers = {
	onSquareClick: (square: string) => void;
	onPieceClick: (square: string) => void;
	onPieceDrag: (square: string) => void;
	canDragPiece: (square: string) => boolean;
	onPieceDrop: (sourceSquare: string, targetSquare: string | null) => boolean;
	onPromotionChoice: (piece: PromotionPieceModel) => void;
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
	takebackSquares,
}: BoardViewModelConfig): BoardViewModel {
	const displayState = useMemo<BoardDisplayState>(
		() => ({
			position: isViewingHistory ? displayPosition : engineState.position,
			boardOrientation: gameInfo.boardOrientation,
			ghostPieces: isViewingHistory ? [] : engineState.ghostPieces,
			selectedSquare: isViewingHistory ? null : interactionState.selectedSquare,
			lastMoveSquares: isViewingHistory
				? viewedLastMove
				: takebackSquares.length > 0
					? { from: null, to: null }
					: engineState.lastMoveSquares,
			checkSquare: isViewingHistory ? null : engineState.checkSquare,
			legalMoves: isViewingHistory ? [] : interactionState.legalMoves,
			premoveQueue: isViewingHistory ? [] : engineState.premoveQueue,
			promotionRequest: isViewingHistory ? null : engineState.promotionRequest,
			showAnimations: engineState.showAnimations,
			rightClickedSquares: interactionState.rightClickedSquares,
			takebackSquares: takebackSquares.map((square) => ({
				from: square.from as Square,
				to: square.to as Square,
			})),
			isDraggable: !isViewingHistory && gameInfo.isMyGame && !gameInfo.isGameEnded,
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
			gameInfo.isMyGame,
			gameInfo.isGameEnded,
			viewedLastMove,
			takebackSquares,
		],
	);

	const handlers = useMemo<BoardHandlers>(
		() => ({
			onSquareClick: interactionHandlers.handleBoardClick,
			onPieceClick: interactionHandlers.handleBoardClick,
			onPieceDrag: isViewingHistory ? () => {} : interactionHandlers.handlePieceDrag,
			canDragPiece: isViewingHistory ? () => false : interactionHandlers.canDragPiece,
			onPieceDrop: isViewingHistory ? () => false : interactionHandlers.onPieceDrop,
			onPromotionChoice: interactionHandlers.handlePromotionChoice,
			onCancelPromotion: () => interactionHandlers.cancelPromotion(),
			onRightClick: (sq: string) => interactionHandlers.handleRightClick(sq as Square),
		}),
		[isViewingHistory, interactionHandlers],
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
