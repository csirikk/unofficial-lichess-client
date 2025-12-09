import { Clock, ChessPawn, ChessKing } from "lucide-react";
import { ConnectionStatus } from "./ConnectionStatus";
import type { GameStatusName } from "../../../generated/types/gameStatusName";
import type { GameEventInfo } from "../../../generated/types/gameEventInfo";
import type { GameJson } from "../../../generated/types/gameJson";
import type { GameFullEvent } from "../../../generated/types/gameFullEvent";
import {
	formatOpening,
	formatTimeControl,
	normalizeClockToSeconds,
	getGameModeLabel,
	getGameStatusLong,
	getGameStatusShort,
	getGameOutcome,
	getOutcomeColorClass,
	getOutcomeLabel,
} from "../model/game-info-helpers";

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
	gameEventInfo?: GameEventInfo | null;
	gameJson?: GameJson | null;
	gameFull?: GameFullEvent | null;
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
	gameEventInfo,
	gameJson,
	gameFull,
	className = "",
}: GameStatusProps) {
	const outcome = getGameOutcome(winner, myColor);

	const speed = gameJson?.speed || gameEventInfo?.speed || gameFull?.speed;
	const rated = gameJson?.rated ?? gameEventInfo?.rated ?? gameFull?.rated;
	const rawClock = gameJson?.clock || gameFull?.clock;
	const clock = normalizeClockToSeconds(rawClock);
	const opening = gameJson?.opening;

	const itemDefs = [
		{ icon: ChessKing, label: getGameModeLabel(speed, rated) },
		{ icon: Clock, label: formatTimeControl(clock) },
		{ icon: ChessPawn, label: formatOpening(opening) ?? "" },
	];

	const gameInfoItems = itemDefs.map((d) => ({
		icon: d.icon as React.ComponentType<{ className?: string }>,
		label: d.label,
		value: "",
		hidden: !d.label,
	}));

	return (
		<div className={`mb-2 shrink-0 ${className}`}>
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

			{/* Game Info Tags */}
			{gameInfoItems.length > 0 && (
				<div className="mt-3 grid gap-2">
					{gameInfoItems.map((item, index) => (
						<div
							key={`${item.label}-${index}`}
							className={`flex items-center w-fit gap-1.5
							px-2 py-1 rounded-md bg-[rgb(var(--color-neutral-400)/0.1)] 
							text-[rgb(var(--color-fg-secondary))] hover:bg-[rgb(var(--color-neutral-400)/0.15)] 
							transition-colors ${item.hidden ? "invisible" : ""}`}
						>
							<item.icon className="h-3.5 w-3.5" />
							<span className="text-sm font-medium">{item.label}</span>
						</div>
					))}
				</div>
			)}

			{error ? (
				<div className="mt-2 text-xs text-[rgb(var(--color-error))]">Error: {error}</div>
			) : (
				<div className="mt-2 text-xs text-[rgb(var(--color-error))] invisible">Error</div>
			)}
		</div>
	);
}
