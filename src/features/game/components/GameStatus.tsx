import { getGameStatusLong, getGameStatusShort } from "../model/game-status-text";
import { getGameOutcome, getOutcomeColorClass, getOutcomeLabel } from "../model/game-outcome";
import { ConnectionStatus } from "./ConnectionStatus";
import type { GameStatusName } from "../../../generated/types/gameStatusName";

export type GameStatusProps = {
	gameEnded: boolean;
	winner: string | null;
	myColor: "white" | "black" | null;
	status: GameStatusName | null;
	isConnected: boolean;
	isConnecting: boolean;
	isReconnecting: boolean;
	isOffline: boolean;
	streamNotFound: boolean;
	error?: string | null;
	className?: string;
};

export function GameStatus({
	gameEnded,
	winner,
	myColor,
	status,
	isConnected,
	isConnecting,
	isReconnecting,
	isOffline,
	streamNotFound,
	error,
	className = "",
}: GameStatusProps) {
	const outcome = getGameOutcome(winner, myColor);

	return (
		<div className={`mb-2 shrink-0 p-2 ${className}`}>
			<div
				className={`text-4xl font-semibold ${
					gameEnded ? getOutcomeColorClass(outcome) : "text-[rgb(var(--color-fg-secondary))]"
				}`}
			>
				{gameEnded ? (
					<span className="uppercase tracking-wide">{getOutcomeLabel(outcome)}</span>
				) : status ? (
					<span className="uppercase tracking-wide">{getGameStatusShort(status)}</span>
				) : (
					<span className="uppercase tracking-wide">Unknown</span>
				)}
			</div>

			<div className="text-sm font-medium">
				{gameEnded ? (
					<span className="text-[rgb(var(--color-fg-secondary))]">
						{getGameStatusLong(status, winner, myColor)}
					</span>
				) : (
					<ConnectionStatus
						isConnected={isConnected}
						isConnecting={isConnecting}
						isReconnecting={isReconnecting}
						isOffline={isOffline}
						streamNotFound={streamNotFound}
					/>
				)}
			</div>

			{error ? (
				<div className="mt-2 text-xs text-[rgb(var(--color-error))]">Error: {error}</div>
			) : (
				<div className="mt-2 text-xs text-[rgb(var(--color-error))] invisible">Error</div>
			)}
		</div>
	);
}
