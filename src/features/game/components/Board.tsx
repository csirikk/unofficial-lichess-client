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
import type { UiPromotionPiece } from "../model/chess";
import { pieceToKey } from "../model/chess";
import type { BoardViewModel } from "../hooks/useBoard";

// Promotion order and labels
const PROMOTION_ORDER: UiPromotionPiece[] = ["q", "r", "b", "n"];
const PROMOTION_LABELS: Record<UiPromotionPiece, string> = {
	q: "Queen",
	r: "Rook",
	b: "Bishop",
	n: "Knight",
};

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

	// Calculate promotion dropdown position
	const promotionDropdown = useMemo(() => {
		if (!promotionRequest || !boardWidth) return null;
		const squareSize = boardWidth / 8;
		const coords = getRelativeCoords(boardOrientation, boardWidth, 8, 8, promotionRequest.to);
		const anchorLeft = coords.x - squareSize / 2;
		const anchorTop = coords.y - squareSize / 2;
		const dropdownHeight = squareSize * PROMOTION_ORDER.length;
		const shouldOpenDownwards = anchorTop < boardWidth / 2;
		const top = shouldOpenDownwards
			? anchorTop + squareSize
			: Math.max(anchorTop - dropdownHeight, 0);
		return {
			left: anchorLeft,
			top,
			squareSize,
			direction: shouldOpenDownwards ? "down" : "up",
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
		tintSquare(lastMoveSquares.from, "rgb(var(--color-chess-move-last) / 0.37)");
		tintSquare(lastMoveSquares.to, "rgb(var(--color-chess-move-last) / 0.37)");

		// Selected square
		if (selectedSquare) {
			tintSquare(selectedSquare, "rgb(var(--color-primary-400) / 0.22)");
			appendShadow(selectedSquare, "inset 0 0 0 2px rgb(var(--color-primary-500) / 0.9)");
		}

		// Legal moves for currently selected piece
		for (const move of legalMoves) {
			const target = move.to as Square;

			if (move.isCapture()) {
				styles[target] = {
					...styles[target],
					backgroundImage:
						"radial-gradient(circle, rgb(var(--color-chess-move-draw) / 0.8) 0, rgb(var(--color-chess-move-draw) / 0.8) 65%, transparent 70%)",
					backgroundRepeat: "no-repeat",
					backgroundPosition: "center",
					backgroundSize: "100% 100%",
				};
			} else {
				const fileIndex = target.charCodeAt(0) - "a".charCodeAt(0);
				const rankIndex = parseInt(target[1], 10) - 1;
				const isLightSquare = (fileIndex + rankIndex) % 2 === 1;

				if (isLightSquare) {
					styles[target] = {
						...styles[target],
						backgroundImage: `
							radial-gradient(circle,
								rgb(var(--color-primary-900) / 0.8) 0,
								rgb(var(--color-primary-900) / 0.8) 30%,
								transparent 35%
							)`,
						backgroundRepeat: "no-repeat",
						backgroundPosition: "center",
						backgroundSize: "40% 40%",
					};
				} else {
					styles[target] = {
						...styles[target],
						backgroundImage: `
							radial-gradient(circle,
								rgb(var(--color-chess-move-legal-dot) / 0.5) 0,
								rgb(var(--color-chess-move-legal-dot) / 0.5) 30%,
								transparent 35%
							)`,
						backgroundRepeat: "no-repeat",
						backgroundPosition: "center",
						backgroundSize: "40% 40%",
					};
				}
			}
		}

		// King in check
		if (checkSquare) {
			tintSquare(checkSquare, "rgb(var(--color-chess-in-check) / 0.18)");
			appendShadow(checkSquare, "inset 0 0 0 2px rgb(var(--color-chess-in-check) / 0.9)");
		}

		// Premove highlight
		for (const step of premoveQueue) {
			tintSquare(step.from, "rgb(var(--color-chess-move-premove) / 0.2)");
			tintSquare(step.to, "rgb(var(--color-chess-move-premove) / 0.4)");
		}

		return styles;
	}, [checkSquare, lastMoveSquares, legalMoves, selectedSquare, premoveQueue, rightClickedSquares]);

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
			<div className="size-full relative" ref={boardContainerRef}>
				<Chessboard
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
						animationDurationInMs: 150,
						arrowOptions: {
							color: "rgb(var(--color-chess-move-premove) / 0.9)",
							secondaryColor: "rgb(var(--color-chess-move-last) / 0.9)",
							tertiaryColor: "rgb(var(--color-chess-move-last) / 0.9)",
							arrowLengthReducerDenominator: 3,
							sameTargetArrowLengthReducerDenominator: 4,
							arrowWidthDenominator: 6,
							activeArrowWidthMultiplier: 0.9,
							opacity: 0.6,
							activeOpacity: 0.5,
						},
						lightSquareStyle: { backgroundColor: "rgb(var(--color-chess-light-square))" },
						darkSquareStyle: { backgroundColor: "rgb(var(--color-chess-dark-square))" },
						darkSquareNotationStyle: {
							color: "rgb(var(--color-chess-light-square))",
						},
						lightSquareNotationStyle: {
							color: "rgb(var(--color-chess-dark-square))",
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
					<>
						<button
							type="button"
							aria-label="Cancel pawn promotion"
							onClick={onCancelPromotion}
							onContextMenu={(event) => {
								event.preventDefault();
								onCancelPromotion();
							}}
							className="cursor-pointer absolute inset-0 z-30 bg-black/30 p-0"
						/>
						<div
							className="absolute z-40 flex overflow-hidden rounded-md border border-[rgb(var(--color-surface-border))] bg-[rgb(var(--color-surface-card))] shadow-lg"
							style={{
								left: promotionDropdown.left,
								top: promotionDropdown.top,
								width: promotionDropdown.squareSize,
								flexDirection: promotionDropdown.direction === "down" ? "column" : "column-reverse",
							}}
						>
							{PROMOTION_ORDER.map((piece) => {
								const pieceKey =
									`${promotionRequest.color}${piece.toUpperCase()}` as keyof PieceRenderObject;
								const PieceIcon = defaultPieces[pieceKey];
								return (
									<button
										key={piece}
										type="button"
										onClick={() => onPromotionChoice(piece)}
										onContextMenu={(event) => event.preventDefault()}
										className="cursor-pointer flex aspect-square w-full items-center justify-center bg-transparent p-0 text-lg text-[rgb(var(--color-fg-primary))] hover:bg-[rgb(var(--color-neutral-400)/0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary-500))]"
									>
										{PieceIcon?.()}
										<span className="sr-only">{PROMOTION_LABELS[piece]}</span>
									</button>
								);
							})}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
