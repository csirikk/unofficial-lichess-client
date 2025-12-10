import type { PieceSymbol } from "chess.js";
import { Infinity as LucideInfinity } from "lucide-react";
import { PIECES_UNICODE, formatClockTime } from "../model/chess";
import { formatRatingDelta, getRatingDeltaClass } from "../model/game-info-helpers";
import { useMemo } from "react";
import type { ClockModel, PlayerModel, Material, RatingDeltas } from "../model/types";
import type { GameColor as Color } from "../../../generated/types/gameColor";

export type ClockProps = {
	color: Color;
	position: "top" | "bottom";
	player: {
		name: string;
		rating: string;
		ratingDelta?: number | null;
	};
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
	const isInfinite = timeString === "∞";
	const [minutes, seconds] = isInfinite ? [null, null] : timeString.split(":");

	const timerClasses = `flex justify-start items-baseline font-mono font-bold tracking-wider leading-none 
		text-4xl sm:text-5xl md:text-6xl lg:text-7xl
		${isLow ? "text-[rgb(var(--color-error))]" : "text-[rgb(var(--color-fg-primary))]"}
		${isCritical && !isUnlimited ? "animate-pulse" : ""}`;

	const containerClasses = `rounded-lg border border-[rgb(var(--color-surface-border)/0.5)]
		bg-[rgb(var(--color-surface-card))]
		px-3 py-2 md:px-5 md:py-4
		text-left transition-opacity
		${isActive ? "" : "opacity-40"}`;

	const nameRating = (
		<div className="flex max-w-100 w-fit text-[rgb(var(--color-fg-primary))]">
			<div
				className={
					position === "top"
						? "truncate bg-[rgb(var(--color-neutral-400)/0.1)] flex items-center px-2 py-1 ml-2 rounded-t-lg"
						: "truncate bg-[rgb(var(--color-neutral-400)/0.1)] flex items-center px-2 py-1 ml-2 rounded-b-lg"
				}
			>
				<div className="truncate text-base sm:text-lg md:text-xl font-bold flex">{player.name}</div>
				<div className="ml-1 text-sm">{player.rating || ""}</div>
				{player.ratingDelta != null && (
					<div
						className={`ml-2 text-xs sm:text-sm font-semibold ${getRatingDeltaClass(player.ratingDelta)}`}
					>
						{formatRatingDelta(player.ratingDelta)}
					</div>
				)}
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
		<div className="flex h-3 items-center px-2 text-[rgb(var(--color-fg-secondary))]">
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
				<span className="ml-2 text-xs sm:text-sm font-semibold text-[rgb(var(--color-fg-secondary))]">
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
					{isInfinite ? (
						<div className="flex w-full items-center justify-center">
							<LucideInfinity
								className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24"
								strokeWidth={2}
							/>
							:
							<LucideInfinity
								className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24"
								strokeWidth={2}
							/>
						</div>
					) : minutes && seconds ? (
						<>
							<div className="flex-1 select-none text-right tabular-nums">{minutes}</div>
							<div className="mx-1 select-none">:</div>
							<div className="flex-1 select-none text-left tabular-nums">{seconds}</div>
						</>
					) : null}
				</div>
			</div>
			{position === "bottom" && nameRating}
			{position === "bottom" && infoRow}
		</div>
	);
}

export type ClockPanelProps = {
	clock: ClockModel;
	whitePlayer: PlayerModel;
	blackPlayer: PlayerModel;
	timerOrder: Color[];
	material: Material;
	ratingChanges?: RatingDeltas;
};

/**
 * Renders both player clocks.
 */
export function ClockPanel({
	clock,
	whitePlayer,
	blackPlayer,
	timerOrder,
	material,
	ratingChanges,
}: ClockPanelProps) {
	const {
		captured: capturedPieces,
		whiteDiff: whiteMaterialDiff,
		blackDiff: blackMaterialDiff,
	} = material;
	const isUnlimited = clock.isUnlimited;

	const playerPanels = {
		white: {
			name: whitePlayer.displayName,
			rating: `(${whitePlayer.displayRating})`,
			ratingDelta: ratingChanges?.white ?? null,
		},
		black: {
			name: blackPlayer.displayName,
			rating: `(${blackPlayer.displayRating})`,
			ratingDelta: ratingChanges?.black ?? null,
		},
	};

	return (
		<div className="w-fit space-y-2">
			{timerOrder.map((color, index) => {
				const isWhite = color === ("white" as Color);
				let ms: number | null = isWhite ? clock.whiteTime : clock.blackTime;
				if (isUnlimited) {
					ms = null;
				}
				const isActive = clock.activeColor === color && clock.isActive;
				const myCaptured = isWhite ? capturedPieces.white : capturedPieces.black;
				const diff = isWhite ? whiteMaterialDiff : blackMaterialDiff;

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
