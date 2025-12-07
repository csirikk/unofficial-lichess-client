import type { GameFullEvent } from "../../../generated/types/gameFullEvent";
import type { PieceSymbol } from "chess.js";
import { PIECES_UNICODE, formatClockTime } from "../logic/chess";
import { useMemo } from "react";

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
	capturedPieces?: PieceSymbol[];
	materialDiff?: number;
};

/**
 * Renders one clock.
 */
export function Clock({
	color,
	position,
	player,
	timeMs,
	isActive,
	isUnlimited,
	materialDiff,
	capturedPieces = [],
}: ClockProps) {
	const isLow = typeof timeMs === "number" && timeMs <= 10000; // 10 seconds
	const isCritical = typeof timeMs === "number" && timeMs <= 5000; // 5 seconds

	const timeString = formatClockTime(timeMs);
	const [minutes, seconds] = timeString.split(":");

	const timerClasses = `flex justify-center items-baseline font-mono font-bold tracking-wider leading-none text-7xl ${
		isLow ? "text-[rgb(var(--color-error))]" : "text-[rgb(var(--color-fg-primary))]"
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

	const capturedKeys = useMemo(() => {
		const counts: Record<string, number> = {};
		return capturedPieces.map((p) => {
			counts[p] = (counts[p] || 0) + 1;
			return `${p}-${counts[p]}`;
		});
	}, [capturedPieces]);

	const infoRow = (
		<div className="flex items-center px-2 h-3 text-[rgb(var(--color-fg-secondary))]">
			{/* Captured Pieces */}
			<div className="-space-x-1 text-lg">
				{capturedPieces.map((p, i) => (
					<span key={capturedKeys[i]} title={p}>
						{PIECES_UNICODE[p]}
					</span>
				))}
			</div>
			{/* Material Difference */}
			{materialDiff != null && materialDiff > 0 && (
				<span className="ml-2 text-sm font-semibold text-[rgb(var(--color-fg-secondary))]">
					+{materialDiff}
				</span>
			)}
		</div>
	);

	return (
		<div>
			{position === "top" && infoRow}
			{position === "top" && nameRating}
			<div key={color} className={containerClasses}>
				<div className={timerClasses}>
					<div className="flex-1 select-none text-right tabular-nums">{minutes}</div>
					<div className="mx-1 select-none">:</div>
					<div className="flex-1 select-none text-left tabular-nums">{seconds}</div>
				</div>
			</div>
			{position === "bottom" && nameRating}
			{position === "bottom" && infoRow}
		</div>
	);
}

export type ClockPanelProps = {
	gameFull: GameFullEvent | null;
	whiteMs: number | null;
	blackMs: number | null;
	activeColor: "w" | "b" | null;
	timerOrder: Array<"white" | "black">;
	captured: { white: PieceSymbol[]; black: PieceSymbol[] };
	whiteDiff: number;
	blackDiff: number;
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
	captured,
	whiteDiff,
	blackDiff,
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
				let ms = isWhite ? whiteMs : blackMs;
				if (isUnlimited) {
					ms = null;
				}
				const isActive = activeColor === (isWhite ? "w" : "b");
				const myCaptured = isWhite ? captured.white : captured.black;
				const diff = isWhite ? whiteDiff : blackDiff;

				return (
					<Clock
						key={color}
						color={color}
						position={index === 0 ? "top" : "bottom"}
						player={playerPanels[color]}
						timeMs={ms}
						isActive={isActive}
						isUnlimited={isUnlimited}
						capturedPieces={myCaptured}
						materialDiff={diff}
					/>
				);
			})}
		</div>
	);
}
