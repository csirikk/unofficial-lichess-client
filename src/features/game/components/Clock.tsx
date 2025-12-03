import type { GameFullEvent } from "../../../generated/types/gameFullEvent";
import { formatClockTime } from "../logic/chess";

export type PlayerInfo = {
	name: string;
	rating: string;
};

export type ClockProps = {
	color: "white" | "black";
	position: "top" | "bottom";
	player: PlayerInfo;
	timeMs: number | null;
	isActive: boolean;
	isUnlimited: boolean;
};

/**
 * Renders one clock.
 */
export function Clock({ color, position, player, timeMs, isActive, isUnlimited }: ClockProps) {
	const isLow = typeof timeMs === "number" && timeMs <= 10000; // 10 seconds
	const isCritical = typeof timeMs === "number" && timeMs <= 5000; // 5 seconds

	const timerClasses = `font-mono font-bold tabular-nums tracking-wider leading-none text-7xl ${
		isUnlimited
			? "text-[rgb(var(--color-surface-card))]"
			: isLow
				? "text-[rgb(var(--color-error))]"
				: "text-[rgb(var(--color-fg-primary))]"
	} ${isCritical && !isUnlimited ? "animate-pulse" : ""}`;

	const containerClasses = `rounded-lg border border-[rgb(var(--color-surface-border)/0.5)] bg-[rgb(var(--color-surface-card))] px-6 py-4 text-center transition-opacity ${
		isActive ? "" : "opacity-40"
	}`;

	const nameRating = (
		<div className="flex text-[rgb(var(--color-fg-primary))]">
			<div
				className={
					position === "top"
						? "bg-[rgb(var(--color-neutral-400)/0.1)] flex items-center px-2 py-1 ml-2 rounded-t-lg"
						: "bg-[rgb(var(--color-neutral-400)/0.1)] flex items-center px-2 py-1 ml-2 rounded-b-lg"
				}
			>
				<div className="text-xl font-bold truncate">{player.name}</div>
				<div className="ml-1 text-sm">{player.rating || ""}</div>
			</div>
		</div>
	);

	return (
		<div>
			{position === "top" && nameRating}
			<div key={color} className={containerClasses}>
				<div className={timerClasses}>{formatClockTime(timeMs)}</div>
			</div>
			{position === "bottom" && nameRating}
		</div>
	);
}

export type ClockPanelProps = {
	gameFull: GameFullEvent | null;
	whiteMs: number | null;
	blackMs: number | null;
	activeColor: "w" | "b" | null;
	timerOrder: Array<"white" | "black">;
};

/**
 * Renders both player clocks.
 */
export function ClockPanel({
	gameFull,
	whiteMs,
	blackMs,
	activeColor,
	timerOrder,
}: ClockPanelProps) {
	const isUnlimited = !gameFull?.clock;

	const playerPanels = {
		white: {
			name: gameFull?.white?.name ?? "Bot",
			rating:
				gameFull?.white?.rating != null
					? `(${gameFull.white.rating})`
					: gameFull?.white?.aiLevel != null
						? `(difficulty ${gameFull.white.aiLevel})`
						: "",
		},
		black: {
			name: gameFull?.black?.name ?? "Bot",
			rating:
				gameFull?.black?.rating != null
					? `(${gameFull.black.rating})`
					: gameFull?.black?.aiLevel != null
						? `(difficulty ${gameFull.black.aiLevel})`
						: "",
		},
	};

	return (
		<div className="flex-1 space-y-3">
			{timerOrder.map((color, index) => {
				const isWhite = color === "white";
				const ms = isWhite ? whiteMs : blackMs;
				const isActive = activeColor === (isWhite ? "w" : "b");

				return (
					<Clock
						key={color}
						color={color}
						position={index === 0 ? "top" : "bottom"}
						player={playerPanels[color]}
						timeMs={ms}
						isActive={isActive}
						isUnlimited={isUnlimited}
					/>
				);
			})}
		</div>
	);
}
