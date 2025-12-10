import { Play, RotateCcw, Trophy, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { IconButton } from "../../../components/IconButton";
import { PlayerInfo } from "./PlayerInfo";
import type { GameModel } from "../model/types";

export type GameResultModalProps = {
	/** Unified game object - single source of truth */
	game: GameModel;
	onRematch: () => void;
	onNewGame: () => void;
	onDismiss: () => void;
};

export function GameResultModal({ game, onRematch, onNewGame, onDismiss }: GameResultModalProps) {
	// All display strings are pre-calculated in the unified model
	const { status, players, info, ratingChanges, offers } = game;
	const [isExiting, setIsExiting] = useState(false);

	const handleDismiss = useCallback(() => {
		setIsExiting(true);
		setTimeout(() => {
			onDismiss();
		}, 100);
	}, [onDismiss]);

	const handleBackdropClick = useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			if (e.target === e.currentTarget) {
				handleDismiss();
			}
		},
		[handleDismiss],
	);

	const me = players.me;
	const opponent = players.opponent;
	const showRatings = info.rated && ratingChanges != null;

	// Calculate dynamic width based on name lengths
	const myNameLength = me?.username?.length || 0;
	const opponentNameLength = opponent?.username?.length || 0;
	const maxNameLength = Math.max(myNameLength, opponentNameLength);
	const modalWidthClass =
		maxNameLength > 20 ? "max-w-2xl" : maxNameLength > 15 ? "max-w-xl" : "max-w-md";

	return (
		<div
			className={`absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4
        ${isExiting ? "animate-backdrop-exit" : "animate-backdrop-entry"}`}
		>
			{/* Backdrop */}
			<button
				type="button"
				onClick={handleBackdropClick}
				className="absolute inset-0 bg-transparent cursor-default"
				aria-label="Close modal by clicking outside"
			/>

			<div
				className={`w-full ${modalWidthClass}
          ${isExiting ? "animate-modal-exit" : "animate-modal-entry"}`}
			>
				{/* Close button */}
				<IconButton
					variant="solid"
					size="md"
					onClick={handleDismiss}
					aria-label="Close modal"
					className="absolute -top-3 -right-3 z-20 shadow-lg shadow-black/40"
				>
					<X />
				</IconButton>

				<Card className="relative overflow-hidden rounded-2xl border border-[rgb(var(--color-surface-border))] bg-[rgb(var(--color-surface-card))]/95 shadow-2xl shadow-black/40">
					{/* Header */}
					<div className="px-6 pt-6 pb-4">
						<div className="flex items-start gap-4">
							{/* Trophy */}
							<div
								className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br shadow-lg shadow-black/40
									 ${status.outcomeGradient} ${status.outcomeColorClass}`}
							>
								<Trophy className="h-8 w-8" />
							</div>
							<div className="flex-1 space-y-1">
								<h2 className={`text-2xl uppercase tracking-wide ${status.outcomeColorClass}`}>
									{status.outcomeLabel}
								</h2>
								<p className="text-xs font-medium uppercase tracking-[0.24em] text-[rgb(var(--color-fg-secondary))]/75">
									{status.statusShort}
								</p>
							</div>
							{/* Game mode and time control */}
							<div className="flex gap-2 text-xl text-[rgb(var(--color-fg-secondary))]">
								{info.speed && <span>{info.speed}</span>}
								{info.timeControlLabel && <span>{info.timeControlLabel}</span>}
							</div>
						</div>
					</div>
					{/* Rating delta */}
					{me && opponent && (
						<div className="px-6 pb-4">
							<div className="grid grid-cols-3 gap-3">
								{/* Player rating */}
								<PlayerInfo
									player={me}
									size="lg"
									layout="vertical"
									label="You"
									showDelta={showRatings}
									showRatingChange={ratingChanges?.[me.color] ?? null}
								/>

								{/* vs */}
								<div className="flex items-center justify-center">
									<span className="text-3xl font-semibold text-[rgb(var(--color-fg-secondary))]">
										vs
									</span>
								</div>

								{/* Opponent rating */}
								<PlayerInfo
									player={opponent}
									size="lg"
									layout="vertical"
									label="Opponent"
									showDelta={showRatings}
									showRatingChange={ratingChanges?.[opponent.color] ?? null}
								/>
							</div>
						</div>
					)}
					{/* Actions */}
					<div className="border-t border-[rgb(var(--color-surface-border))] whitespace-nowrap px-2 pt-4 space-y-3">
						<div className="grid grid-cols-2 gap-3">
							{players.me ? (
								<Button
									variant="primary"
									size="lg"
									onClick={onRematch}
									disabled={offers.rematchPending}
								>
									<RotateCcw className={`h-5 w-5 ${offers.rematchPending ? "animate-spin" : ""}`} />
									{offers.rematchPending ? "Rematch Sent..." : "Rematch"}
								</Button>
							) : (
								<Button
									variant="outline"
									size="lg"
									onClick={() => {
										handleDismiss();
										onNewGame();
									}}
								>
									<Play className="h-5 w-5 fill-current" />
									New Game
								</Button>
							)}

							<Button
								variant="outline"
								size="lg"
								onClick={() => {
									handleDismiss();
									onNewGame();
								}}
							>
								<Play className="h-5 w-5 fill-current" />
								New Game
							</Button>
						</div>
					</div>
				</Card>
			</div>
		</div>
	);
}
