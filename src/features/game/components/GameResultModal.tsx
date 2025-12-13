/**
 * GameResultModal.tsx
 *
 * Modal dialog showing game result, ratings and rematch/new game actions.
 */

import { Play, RotateCw, Trophy, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { IconButton } from "../../../components/IconButton";
import { PlayerInfo } from "./PlayerInfo";
import type { GameModel } from "../model/types";

export type GameResultModalProps = {
	game: GameModel;
	onRematch: () => void;
	onNewGame: () => void;
	onDismiss: () => void;
};

export function GameResultModal({ game, onRematch, onNewGame, onDismiss }: GameResultModalProps) {
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

	return (
		<div
			className={`absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4
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
				className={`w-fit min-w-100 max-w-[90vw]
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
						<div className="flex items-center gap-4 whitespace-nowrap">
							{/* Trophy */}
							<div
								className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br shadow-lg shadow-black/40
                                     ${status.outcomeGradient} ${status.outcomeColorClass}`}
							>
								<Trophy className="h-6 w-6" />
							</div>
							<div className="flex-1 min-w-0 space-y-0.5">
								<h2
									className={`text-xl uppercase tracking-wide truncate ${status.outcomeColorClass}`}
								>
									{status.outcomeLabel}
								</h2>
								<p className="text-[10px] font-medium uppercase tracking-widest text-[rgb(var(--color-fg-secondary))]/75 truncate">
									{status.statusShort}
								</p>
							</div>
							{/* Game mode and time control */}
							<div className="flex shrink-0 gap-1.5 text-sm text-[rgb(var(--color-fg-secondary))]">
								{info.speed && <span>{info.speed}</span>}
								{info.timeControlLabel && <span>·</span>}
								{info.timeControlLabel && <span>{info.timeControlLabel}</span>}
							</div>
						</div>
					</div>
					{/* Rating delta */}
					{me && opponent && (
						<div className="px-6 pb-4">
							<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
								{/* Player rating */}
								<div className="min-w-0">
									<PlayerInfo
										player={me}
										size="lg"
										layout="vertical"
										label="You"
										showDelta={showRatings}
										showRatingChange={ratingChanges?.[me.color] ?? null}
									/>
								</div>

								{/* vs */}
								<div className="shrink-0 self-center">
									<span className="text-2xl font-semibold text-[rgb(var(--color-fg-secondary))]">
										vs
									</span>
								</div>

								{/* Opponent rating */}
								<div className="min-w-0">
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
									{offers.rematchPending && <RotateCw className="h-5 w-5 mr-2 animate-spin" />}
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
