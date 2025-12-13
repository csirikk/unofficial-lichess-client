/**
 * PromotionMenu.tsx
 *
 * UI menu shown when a pawn is promoted to choose the piece.
 */

import { defaultPieces, type PieceRenderObject } from "react-chessboard";
import type { GameColor } from "../../../generated/types/gameColor";
import type { PromotionPieceModel } from "../model/chess";

const PROMOTION_ORDER: PromotionPieceModel[] = ["q", "r", "b", "n"];
const PROMOTION_LABELS: Record<PromotionPieceModel, string> = {
	q: "Queen",
	r: "Rook",
	b: "Bishop",
	n: "Knight",
};

type PromotionMenuProps = {
	color: GameColor;
	left: number;
	top: number;
	squareSize: number;
	direction: "up" | "down";
	onSelect: (piece: PromotionPieceModel) => void;
	onCancel: () => void;
};

export function PromotionMenu({
	color,
	left,
	top,
	squareSize,
	direction,
	onSelect,
	onCancel,
}: PromotionMenuProps) {
	return (
		<>
			<button
				type="button"
				aria-label="Cancel pawn promotion"
				onClick={onCancel}
				onContextMenu={(e) => {
					e.preventDefault();
					onCancel();
				}}
				className="absolute inset-0 z-30 cursor-pointer bg-black/30 p-0"
			/>
			<div
				className="absolute z-40 flex overflow-hidden rounded-md border border-[rgb(var(--color-surface-border))] bg-[rgb(var(--color-surface-card))] shadow-lg"
				style={{
					left,
					top,
					width: squareSize,
					flexDirection: direction === "down" ? "column" : "column-reverse",
				}}
			>
				{PROMOTION_ORDER.map((piece) => {
					const colorChar = color[0];
					const pieceKey = `${colorChar}${piece.toUpperCase()}` as keyof PieceRenderObject;
					const PieceIcon = defaultPieces[pieceKey];

					return (
						<button
							key={piece}
							type="button"
							onClick={() => onSelect(piece)}
							onContextMenu={(e) => e.preventDefault()}
							className="flex aspect-square w-full cursor-pointer items-center justify-center bg-transparent p-0 text-lg text-[rgb(var(--color-fg-primary))] hover:bg-[rgb(var(--color-neutral-400)/0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary-500))]"
						>
							{PieceIcon && <PieceIcon />}
							<span className="sr-only">{PROMOTION_LABELS[piece]}</span>
						</button>
					);
				})}
			</div>
		</>
	);
}
