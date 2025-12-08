import { Play, RotateCcw, Trophy, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { IconButton } from "../../../components/IconButton";
import { getGameStatusLong, getGameStatusShort } from "../model/game-status-text";
import {
	getGameOutcome,
	getOutcomeColorClass,
	getOutcomeGradient,
	getOutcomeLabel,
} from "../model/game-outcome";
import { PlayerInfo } from "./PlayerInfo";
import type { GameFullEvent } from "../../../generated/types/gameFullEvent";

export type GameResultModalProps = {
	winner: string | null;
	reason: string | null;
	myColor: "white" | "black" | null;
	gameFull: GameFullEvent | null;
	ratingDelta?: {
		player: number | null;
		opponent: number | null;
	} | null;
	onRematch: () => void;
	onNewGame: () => void;
	onDismiss: () => void;
};

export function GameResultModal({
	winner,
	reason,
	myColor,
	gameFull,
	ratingDelta,
	onRematch,
	onNewGame,
	onDismiss,
}: GameResultModalProps) {
	const outcome = getGameOutcome(winner, myColor);
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

	const myPlayer = myColor === "white" ? gameFull?.white : gameFull?.black;
	const opponentPlayer = myColor === "white" ? gameFull?.black : gameFull?.white;
	const myDelta = ratingDelta?.player ?? null;
	const opponentDelta = ratingDelta?.opponent ?? null;
	const showRatings = gameFull?.rated && myPlayer?.rating != null && opponentPlayer?.rating != null;

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
				className={`w-full max-w-md
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
								className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg shadow-black/40
									 ${getOutcomeGradient(outcome)} ${getOutcomeColorClass(outcome)}`}
							>
								<Trophy className="h-8 w-8" />
							</div>
							<div className="flex-1 space-y-1">
								<h2 className={`text-2xl uppercase tracking-wide ${getOutcomeColorClass(outcome)}`}>
									{getOutcomeLabel(outcome)}
								</h2>{" "}
								<p className="text-xs font-medium uppercase tracking-[0.24em] text-[rgb(var(--color-fg-secondary))]/75">
									by {getGameStatusShort(reason)}
								</p>
							</div>
						</div>

						{/* Long description */}
						<p className="mt-3 text-sm leading-relaxed text-[rgb(var(--color-fg-secondary))]">
							{getGameStatusLong(reason, winner, myColor)}
						</p>
					</div>
					{/* Rating delta */}
					{(showRatings || myPlayer?.aiLevel != null || opponentPlayer?.aiLevel != null) && (
						<div className="px-6 pb-4">
							<div className="grid grid-cols-3 gap-3">
								{/* Player rating */}
								<PlayerInfo
									name={myPlayer?.name || "Player"}
									rating={myPlayer?.rating}
									aiLevel={myPlayer?.aiLevel}
									ratingDelta={showRatings ? myDelta : null}
									size="lg"
									layout="vertical"
									label="You"
								/>

								{/* vs */}
								<div className="flex items-center justify-center">
									<span className="text-3xl font-semibold text-[rgb(var(--color-fg-secondary))]">
										vs
									</span>
								</div>

								{/* Opponent rating */}
								<PlayerInfo
									name={opponentPlayer?.name || "Bot"}
									rating={opponentPlayer?.rating}
									aiLevel={opponentPlayer?.aiLevel}
									ratingDelta={showRatings ? opponentDelta : null}
									size="lg"
									layout="vertical"
									label="Opponent"
								/>
							</div>
						</div>
					)}
					{/* Actions */}
					<div className="border-t border-[rgb(var(--color-surface-border))] px-2 pt-4 space-y-3">
						<div className="grid grid-cols-2 gap-3">
							<Button variant="primary" size="lg" onClick={onRematch}>
								<RotateCcw className="h-5 w-5" />
								Rematch
							</Button>

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
