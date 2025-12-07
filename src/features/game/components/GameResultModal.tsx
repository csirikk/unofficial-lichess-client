import { Play, RotateCcw, Trophy, X } from "lucide-react";
import { useCallback, useRef } from "react";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { IconButton } from "../../../components/IconButton";

export type GameResultModalProps = {
	winner: string | null;
	reason: string | null;
	myColor: "white" | "black" | null;
	ratingDelta?: { player: number; opponent: number } | null;
	onRematch: () => void;
	onNewGame: () => void;
	onDismiss: () => void;
};

export function GameResultModal({
	winner,
	reason,
	myColor,
	ratingDelta,
	onRematch,
	onNewGame,
	onDismiss,
}: GameResultModalProps) {
	const isWin = myColor && winner === myColor;
	const isDraw = winner === null || winner === "";
	const isLoss = myColor && winner && winner !== myColor;
	const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const handleBackdropClick = useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			if (e.target === e.currentTarget) {
				// Clear any existing timeout
				if (dismissTimeoutRef.current) {
					clearTimeout(dismissTimeoutRef.current);
				}
				// Set new timeout for debounced dismiss
				dismissTimeoutRef.current = setTimeout(() => {
					onDismiss();
				}, 300);
			}
		},
		[onDismiss],
	);

	return (
		<div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-[0.8px] p-4">
			{/* Invisible backdrop button for click-outside dismissal */}
			<button
				type="button"
				onClick={handleBackdropClick}
				className="absolute inset-0 bg-transparent"
			/>
			<div className="relative w-full max-w-sm animate-in fade-in zoom-in duration-200 z-10">
				<IconButton
					variant="solid"
					size="md"
					onClick={onDismiss}
					aria-label="Close modal"
					className="absolute -top-3 -right-3 z-10"
				>
					<X />
				</IconButton>

				<Card className="shadow-2xl overflow-hidden">
					{/* Header */}
					<div className="text-center mb-6">
						<div
							className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full ${
								isWin
									? "bg-[rgb(var(--color-success)/0.1)] text-[rgb(var(--color-success))]"
									: isDraw
										? "bg-[rgb(var(--color-surface-border))] text-[rgb(var(--color-fg-secondary))]"
										: "bg-[rgb(var(--color-error)/0.1)] text-[rgb(var(--color-error))]"
							}`}
						>
							<Trophy className="h-8 w-8" />
						</div>
						<h2 className="text-3xl font-bold tracking-tight text-white">
							{isWin ? "You Won!" : isDraw ? "Draw" : isLoss ? "You Lost" : "Game Over"}
						</h2>
						<p className="text-xl font-medium uppercase tracking-widest text-[rgb(var(--color-fg-secondary))] mt-1">
							{reason || "Checkmate"}
						</p>
					</div>

					{/* Rating delta */}
					{ratingDelta && (
						<div className="mb-6 flex justify-center gap-8 text-center">
							<div>
								<div className="text-sm font-medium text-[rgb(var(--color-fg-secondary))]">You</div>
								<div
									className={`text-2xl font-bold ${
										ratingDelta.player > 0
											? "text-[rgb(var(--color-success))]"
											: ratingDelta.player < 0
												? "text-[rgb(var(--color-error))]"
												: "text-[rgb(var(--color-fg-secondary))]"
									}`}
								>
									{ratingDelta.player >= 0 ? "+" : ""}
									{ratingDelta.player}
								</div>
							</div>
							<div>
								<div className="text-sm font-medium text-[rgb(var(--color-fg-secondary))]">
									Opponent
								</div>
								<div
									className={`text-2xl font-bold ${
										ratingDelta.opponent > 0
											? "text-[rgb(var(--color-success))]"
											: ratingDelta.opponent < 0
												? "text-[rgb(var(--color-error))]"
												: "text-[rgb(var(--color-fg-secondary))]"
									}`}
								>
									{ratingDelta.opponent >= 0 ? "+" : ""}
									{ratingDelta.opponent}
								</div>
							</div>
						</div>
					)}

					{/* Actions */}
					<div className="space-y-3">
						<div className="grid grid-cols-2 gap-3">
							<Button variant="ghost" size="lg" onClick={onRematch} className="rounded-xl">
								<RotateCcw className="h-5 w-5" />
								Rematch
							</Button>

							<Button
								variant="primary"
								size="lg"
								onClick={onNewGame}
								className="rounded-xl shadow-lg"
							>
								<Play className="h-5 w-5 fill-current" />
								New Game
							</Button>
						</div>

						<Button
							variant="text"
							fullWidth
							onClick={onDismiss}
							className="uppercase tracking-wider"
						>
							Analyze Board
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
}
