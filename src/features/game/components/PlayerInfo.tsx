import { formatRatingDelta, getRatingDeltaClass } from "../model/game-info-helpers";

export type PlayerInfoProps = {
	name: string;
	rating?: number | null;
	aiLevel?: number | null;
	ratingDelta?: number | null;
	size?: "sm" | "md" | "lg";
	layout?: "horizontal" | "vertical";
	label?: string;
	showDelta?: boolean;
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

function getPlayerRatingDisplay(player: {
	rating?: number | null;
	aiLevel?: number | null;
}): string | number | null {
	if (player.rating != null) return player.rating;
	if (player.aiLevel != null) return `Level ${player.aiLevel}`;
	return null;
}

export function PlayerInfo({
	name,
	rating,
	aiLevel,
	ratingDelta,
	size = "md",
	layout = "vertical",
	label,
	showDelta = true,
	className = "",
}: PlayerInfoProps) {
	const classes = sizeClasses[size];
	const displayRating = getPlayerRatingDisplay({ rating, aiLevel });

	if (layout === "horizontal") {
		return (
			<div className={`flex items-center gap-2 ${className}`}>
				{label && (
					<div className="text-xs font-medium uppercase tracking-wider text-[rgb(var(--color-fg-secondary))]">
						{label}
					</div>
				)}
				<div className={`font-bold truncate ${classes.name}`}>{name}</div>
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
			<div className={`truncate font-bold px-2 ${classes.name}`}>{name}</div>
			<div className={classes.rating}>
				{displayRating || "-"}
				{showDelta && ratingDelta != null && (
					<span className={`ml-1.5 ${classes.delta} ${getRatingDeltaClass(ratingDelta)}`}>
						{formatRatingDelta(ratingDelta)}
					</span>
				)}
			</div>
		</div>
	);
}
