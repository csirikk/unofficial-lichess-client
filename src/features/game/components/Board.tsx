/**
 * Board.tsx
 *
 * Chess board view, rendering and interaction handlers.
 */

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Square } from "chess.js";
import {
	Chessboard,
	type ChessboardOptions,
	defaultPieces,
	getRelativeCoords,
	type PieceDropHandlerArgs,
	type PieceRenderObject,
} from "react-chessboard";
import { pieceToKey } from "../model/chess";
import type { BoardViewModel } from "../hooks/useBoard";
import { PromotionMenu } from "./PromotionMenu";

export type BoardProps = {
	viewModel: BoardViewModel;
};

export function Board({ viewModel }: BoardProps) {
	const { displayState, handlers } = viewModel;
	const {
		position,
		boardOrientation,
		ghostPieces,
		selectedSquare,
		lastMoveSquares,
		checkSquare,
		legalMoves,
		premoveQueue,
		promotionRequest,
		showAnimations,
		rightClickedSquares,
		takebackSquares,
		isDraggable,
		visuals,
	} = displayState;

	const {
		onSquareClick,
		onPieceClick,
		onPieceDrag,
		canDragPiece,
		onPieceDrop,
		onPromotionChoice,
		onCancelPromotion,
		onRightClick,
	} = handlers;

	const [boardWidth, setBoardWidth] = useState(0);
	const boardResizeCleanupRef = useRef<(() => void) | null>(null);

	// Manual board physics: measure container width to position promotion menu and calculate square sizes
	const boardContainerRef = useCallback((node: HTMLDivElement | null) => {
		boardResizeCleanupRef.current?.();
		boardResizeCleanupRef.current = null;

		if (!node) {
			setBoardWidth(0);
			return;
		}

		const measure = () => {
			setBoardWidth(node.getBoundingClientRect().width);
		};

		measure();

		if (typeof window === "undefined") return;
		const globalWindow = window as Window & typeof globalThis;

		if ("ResizeObserver" in globalWindow) {
			const observer = new ResizeObserver(() => measure());
			observer.observe(node);
			boardResizeCleanupRef.current = () => observer.disconnect();
			return;
		}
	}, []);

	useEffect(
		() => () => {
			boardResizeCleanupRef.current?.();
		},
		[],
	);

	const boardColors = visuals.colors;

	// Calculate promotion dropdown position
	const promotionDropdown = useMemo(() => {
		if (!promotionRequest || !boardWidth) return null;
		const squareSize = boardWidth / 8;
		const coords = getRelativeCoords(boardOrientation, boardWidth, 8, 8, promotionRequest.to);
		const anchorLeft = coords.x - squareSize / 2;
		const anchorTop = coords.y - squareSize / 2;
		const dropdownHeight = squareSize * 4; // 4 promotion options
		const shouldOpenDownwards = anchorTop < boardWidth / 2;
		const top = shouldOpenDownwards
			? anchorTop + squareSize
			: Math.max(anchorTop - dropdownHeight, 0);
		return {
			left: anchorLeft,
			top,
			squareSize,
			direction: shouldOpenDownwards ? ("down" as const) : ("up" as const),
		};
	}, [boardOrientation, boardWidth, promotionRequest]);

	// Build square styles
	const squareStyles = useMemo<Record<string, CSSProperties>>(() => {
		const styles: Record<string, CSSProperties> = {};

		const appendShadow = (square: Square | null, shadow: string) => {
			if (!square) return;
			const previous = styles[square] ?? {};
			const nextShadow = previous.boxShadow ? `${previous.boxShadow}, ${shadow}` : shadow;
			styles[square] = { ...previous, boxShadow: nextShadow };
		};

		const tintSquare = (square: Square | null, color: string) => {
			if (!square) return;
			appendShadow(square, `inset 0 0 0 9999px ${color}`);
		};

		// Right-click highlights
		for (const square of Object.keys(rightClickedSquares)) {
			tintSquare(square as Square, "rgb(var(--color-error) / 0.7)");
		}

		// Last move
		tintSquare(lastMoveSquares.from, boardColors.lastMoveHighlight);
		tintSquare(lastMoveSquares.to, boardColors.lastMoveHighlight);

		// Selected square
		if (selectedSquare) {
			tintSquare(selectedSquare, boardColors.selectedHighlight);
			appendShadow(
				selectedSquare,
				visuals.themeCode === "classic"
					? "inset 0 0 0 2px rgba(20, 85, 30, 0.9)"
					: "inset 0 0 0 2px rgb(var(--color-primary-500) / 0.9)",
			);
		}

		// Legal moves for currently selected piece
		for (const move of legalMoves) {
			const target = move.to as Square;

			if (move.isCapture()) {
				styles[target] = {
					...styles[target],
					backgroundImage: `radial-gradient(circle, ${boardColors.captureHighlight} 0, ${boardColors.captureHighlight} 65%, transparent 70%)`,
					backgroundRepeat: "no-repeat",
					backgroundPosition: "center",
					backgroundSize: "100% 100%",
				};
			} else {
				const fileIndex = target.charCodeAt(0) - "a".charCodeAt(0);
				const rankIndex = parseInt(target[1], 10) - 1;
				const isLightSquare = (fileIndex + rankIndex) % 2 === 1;

				const dotColor = isLightSquare ? boardColors.legalDotLight : boardColors.legalDotDark;
				styles[target] = {
					...styles[target],
					backgroundImage: `radial-gradient(circle, ${dotColor} 0, ${dotColor} 30%, transparent 35%)`,
					backgroundRepeat: "no-repeat",
					backgroundPosition: "center",
					backgroundSize: "40% 40%",
				};
			}
		}

		// King in check
		if (checkSquare) {
			tintSquare(
				checkSquare,
				visuals.themeCode === "classic"
					? "rgba(255, 0, 0, 0.18)"
					: "rgb(var(--color-chess-in-check) / 0.18)",
			);
			appendShadow(
				checkSquare,
				visuals.themeCode === "classic"
					? "inset 0 0 0 2px rgba(255, 0, 0, 0.89)"
					: "inset 0 0 0 2px rgb(var(--color-chess-in-check) / 0.9)",
			);
		}

		// Premove highlight
		for (const step of premoveQueue) {
			tintSquare(
				step.from,
				visuals.themeCode === "classic"
					? "rgba(155, 199, 0, 0.2)"
					: "rgb(var(--color-chess-move-premove) / 0.2)",
			);
			tintSquare(
				step.to,
				visuals.themeCode === "classic"
					? "rgba(155, 199, 0, 0.4)"
					: "rgb(var(--color-chess-move-premove) / 0.4)",
			);
		}

		// Takeback highlights
		for (const takebackSquare of takebackSquares) {
			tintSquare(takebackSquare.from as Square, boardColors.lastMoveHighlight);
			tintSquare(takebackSquare.to as Square, boardColors.lastMoveHighlight);
		}

		return styles;
	}, [
		checkSquare,
		lastMoveSquares,
		legalMoves,
		selectedSquare,
		premoveQueue,
		rightClickedSquares,
		takebackSquares,
		boardColors,
		visuals.themeCode,
	]);

	// Handlers for react-chessboard
	const handleSquareClick: ChessboardOptions["onSquareClick"] = ({ square }) => {
		if (square) onSquareClick(square);
	};

	const handlePieceClick: ChessboardOptions["onPieceClick"] = ({ square }) => {
		if (square) onPieceClick(square);
	};

	const handlePieceDrag: ChessboardOptions["onPieceDrag"] = ({ square }) => {
		if (square) onPieceDrag(square);
	};

	const handleCanDragPiece: ChessboardOptions["canDragPiece"] = ({ square }) => {
		if (!square) return false;
		return canDragPiece(square);
	};

	const handlePieceDrop: ChessboardOptions["onPieceDrop"] = (
		args: PieceDropHandlerArgs,
	): boolean => {
		const { sourceSquare, targetSquare } = args;
		if (!targetSquare) return false;
		return onPieceDrop(sourceSquare, targetSquare);
	};

	const handleSquareRightClick: ChessboardOptions["onSquareRightClick"] = ({ square }) => {
		if (square) {
			onRightClick(square);
		}
	};

	return (
		<div className="aspect-square w-full max-w-full border border-[rgb(var(--color-surface-border)/0.8)] bg-[rgb(var(--color-surface-base))] p-2">
			<div
				data-history-target="true"
				className={`size-full relative ${!isDraggable ? "**:data-piece:cursor-default!" : ""}`}
				ref={boardContainerRef}
			>
				<Chessboard
					key={visuals.preferencesVersion}
					options={{
						position,
						boardOrientation,
						onPieceDrop: handlePieceDrop,
						onSquareClick: handleSquareClick,
						onPieceClick: handlePieceClick,
						onPieceDrag: handlePieceDrag,
						canDragPiece: handleCanDragPiece,
						onSquareRightClick: handleSquareRightClick,
						squareStyles,
						showAnimations,
						showNotation: visuals.showCoordinates,
						animationDurationInMs: 150,
						arrowOptions: visuals.useCustomArrows
							? {
									color: boardColors.premoveHighlight,
									secondaryColor: boardColors.lastMoveHighlight,
									tertiaryColor: boardColors.lastMoveHighlight,
									arrowLengthReducerDenominator: 3,
									sameTargetArrowLengthReducerDenominator: 4,
									arrowWidthDenominator: 6,
									activeArrowWidthMultiplier: 0.9,
									opacity: 0.6,
									activeOpacity: 0.5,
								}
							: undefined,
						lightSquareStyle: { backgroundColor: boardColors.lightSquare },
						darkSquareStyle: { backgroundColor: boardColors.darkSquare },
						darkSquareNotationStyle: {
							color: boardColors.coordinateLight,
						},
						lightSquareNotationStyle: {
							color: boardColors.coordinateDark,
						},
					}}
				/>

				{/* Ghost overlay - actual pieces in low opacity during premoves */}
				{ghostPieces.map((ghost) => {
					if (!boardWidth) return null;

					const squareSize = boardWidth / 8;
					const coords = getRelativeCoords(boardOrientation, boardWidth, 8, 8, ghost.square);

					const pieceKey = pieceToKey(ghost.piece) as keyof PieceRenderObject;
					const PieceIcon = defaultPieces[pieceKey];
					if (!PieceIcon) return null;
					return (
						<div
							key={`ghost-${ghost.square}`}
							className="absolute pointer-events-none"
							style={{
								left: coords.x - squareSize / 2,
								top: coords.y - squareSize / 2,
								width: squareSize,
								height: squareSize,
								opacity: 0.3,
							}}
						>
							<PieceIcon />
						</div>
					);
				})}

				{/* Promotion dialog */}
				{promotionRequest && promotionDropdown && (
					<PromotionMenu
						color={promotionRequest.color}
						left={promotionDropdown.left}
						top={promotionDropdown.top}
						squareSize={promotionDropdown.squareSize}
						direction={promotionDropdown.direction}
						onSelect={onPromotionChoice}
						onCancel={onCancelPromotion}
					/>
				)}
			</div>
		</div>
	);
}
