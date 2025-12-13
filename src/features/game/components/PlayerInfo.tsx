/**
 * PlayerInfo.tsx
 *
 * Displays player name, rating and rating delta for a game participant.
 */

import { formatRatingDelta, getRatingDeltaClass } from "../model/game-info-helpers";
import type { PlayerModel } from "../model/types";

export type PlayerInfoProps = {
	player: PlayerModel;
	size?: "sm" | "md" | "lg";
	layout?: "horizontal" | "vertical";
	label?: string;
	showDelta?: boolean;
	showRatingChange?: number | null;
	className?: string;
};

const sizeClasses = {
	sm: {
		name: "text-sm",
		rating: "text-xs",
		delta: "text-xs",
	},
	md: {
		name: "text-base sm:text-lg md:text-xl",
		rating: "text-sm",
		delta: "text-xs sm:text-sm",
	},
	lg: {
		name: "text-base text-xl",
		rating: "text-xl",
		delta: "text-sm",
	},
};

export function PlayerInfo({
	player,
	size = "md",
	layout = "vertical",
	label,
	showDelta = true,
	showRatingChange,
	className = "",
}: PlayerInfoProps) {
	const classes = sizeClasses[size];
	const displayName = player.displayName;
	const displayRating = player.displayRating;
	const ratingDelta = showRatingChange ?? null;

	if (layout === "horizontal") {
		return (
			<div className={`flex items-center gap-2 ${className}`}>
				{label && (
					<div className="text-xs font-medium uppercase tracking-wider text-[rgb(var(--color-fg-secondary))]">
						{label}
					</div>
				)}
				<div className={`font-bold truncate ${classes.name}`}>{displayName}</div>
				{displayRating && <div className={classes.rating}>({displayRating})</div>}
				{showDelta && ratingDelta != null && (
					<div className={`font-semibold ${classes.delta} ${getRatingDeltaClass(ratingDelta)}`}>
						{formatRatingDelta(ratingDelta)}
					</div>
				)}
			</div>
		);
	}

	return (
		<div className={`space-y-1 text-center ${className}`}>
			{label && (
				<div className="text-xs font-medium uppercase tracking-wider text-[rgb(var(--color-fg-secondary))]">
					{label}
				</div>
			)}
			<div className={`truncate font-bold px-2 ${classes.name}`}>{displayName}</div>
			<div className={classes.rating}>
				{displayRating}
				{showDelta && ratingDelta != null && (
					<span className={`ml-1.5 ${classes.delta} ${getRatingDeltaClass(ratingDelta)}`}>
						{formatRatingDelta(ratingDelta)}
					</span>
				)}
			</div>
		</div>
	);
}
