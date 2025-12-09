import type { Speed } from "../../../generated/types/speed";
import type { GameJsonClock } from "../../../generated/types/gameJsonClock";
import type { GameOpening } from "../../../generated/types/gameOpening";
import { GameStatusName } from "../../../generated/types/gameStatusName";

export type GameOutcome = "win" | "draw" | "loss" | null;

export function getGameOutcome(
	winner: string | null,
	myColor: "white" | "black" | null,
): GameOutcome {
	if (!myColor) return null;
	if (!winner || winner === "") return "draw";
	return winner === myColor ? "win" : "loss";
}

export function getOutcomeLabel(outcome: GameOutcome): string {
	if (outcome === "win") return "Victory";
	if (outcome === "draw") return "Draw";
	if (outcome === "loss") return "Defeat";
	return "Game Over";
}

export function getOutcomeColorClass(outcome: GameOutcome): string {
	if (outcome === "win") return "game-outcome-win";
	if (outcome === "draw") return "game-outcome-draw";
	if (outcome === "loss") return "game-outcome-loss";
	return "text-[rgb(var(--color-fg-secondary))]";
}

export function getOutcomeGradient(outcome: GameOutcome): string {
	if (outcome === "win") return "from-emerald-500/15 via-emerald-400/5 to-emerald-300/10";
	if (outcome === "draw") return "from-slate-500/15 via-slate-400/5 to-slate-300/10";
	if (outcome === "loss") return "from-rose-500/18 via-rose-400/5 to-rose-300/10";
	return "from-slate-500/15 via-slate-400/5 to-slate-300/10";
}

export function getRatingDeltaClass(delta: number | null): string {
	if (delta == null) return "rating-delta-neutral";
	if (delta > 0) return "rating-delta-positive";
	if (delta < 0) return "rating-delta-negative";
	return "rating-delta-neutral";
}

export function formatRatingDelta(delta: number | null): string {
	if (delta == null) return "";
	if (delta > 0) return `+${delta}`;
	return delta.toString();
}

export function getPlayerRatingDisplay(player?: {
	rating?: number | null;
	aiLevel?: number | null;
}): string | number {
	if (!player) return "-";
	if (player.rating != null) return player.rating;
	if (player.aiLevel != null) return `Level ${player.aiLevel}`;
	return "-";
}

export function getGameStatusLong(
	status: string | null,
	winner?: string | null,
	myColor?: string | null,
): string {
	if (!status) return "Game ended";

	const isMyWin = myColor && winner === myColor;
	const isOpponentWin = myColor && winner && winner !== myColor;

	const winnerColor = winner === "white" ? "White" : winner === "black" ? "Black" : null;
	const loserColor = winner === "white" ? "Black" : winner === "black" ? "White" : null;
	const myLabel = isMyWin ? "You won" : isOpponentWin ? "Your opponent won" : null;
	const opponentLabel = isOpponentWin ? "You" : isMyWin ? "Your opponent" : null;

	switch (status) {
		case GameStatusName.created:
			return "Game was created but not started";
		case GameStatusName.started:
			return "Game is in progress";
		case GameStatusName.aborted:
			return "Game was aborted";
		case GameStatusName.mate:
			if (myLabel) return `${myLabel} by checkmate`;
			if (winnerColor) return `${winnerColor} won by checkmate`;
			return "Checkmate";
		case GameStatusName.resign:
			if (opponentLabel) return `${opponentLabel} resigned`;
			if (loserColor) return `${loserColor} resigned`;
			return "Player resigned";
		case GameStatusName.stalemate:
			return "Draw by stalemate - no legal moves available";
		case GameStatusName.timeout:
			if (opponentLabel) return `${opponentLabel} ran out of time`;
			if (loserColor) return `${loserColor} ran out of time`;
			return "Player ran out of time";
		case GameStatusName.draw:
			return "Draw by agreement";
		case GameStatusName.outoftime:
			if (opponentLabel) return `${opponentLabel} lost on time`;
			if (loserColor) return `${loserColor} lost on time`;
			return "Time forfeit";
		case GameStatusName.cheat:
			if (opponentLabel) return `${opponentLabel} was caught cheating`;
			if (loserColor) return `${loserColor} was caught cheating`;
			return "Cheat detected";
		case GameStatusName.noStart:
			return "Game didn't start";
		case GameStatusName.unknownFinish:
			return "Game ended unexpectedly";
		case GameStatusName.insufficientMaterialClaim:
			return "Draw by insufficient material";
		case GameStatusName.variantEnd:
			return "Variant-specific end condition reached";
		default:
			return status;
	}
}

export function getGameStatusShort(status: string | null): string {
	if (!status) return "Unknown";

	switch (status) {
		case GameStatusName.created:
			return "Created";
		case GameStatusName.started:
			return "In Progress";
		case GameStatusName.aborted:
			return "Aborted";
		case GameStatusName.mate:
			return "By Checkmate";
		case GameStatusName.resign:
			return "By Resignation";
		case GameStatusName.stalemate:
			return "By Stalemate";
		case GameStatusName.timeout:
			return "By Timeout";
		case GameStatusName.draw:
			return "Draw";
		case GameStatusName.outoftime:
			return "By Time Forfeit";
		case GameStatusName.cheat:
			return "By Cheat Detected";
		case GameStatusName.noStart:
			return "Not Started";
		case GameStatusName.unknownFinish:
			return "Unknown Finish";
		case GameStatusName.insufficientMaterialClaim:
			return "By Insufficient Material";
		case GameStatusName.variantEnd:
			return "Variant End";
		default:
			return status;
	}
}

export function formatSpeed(speed: Speed | string | undefined): string {
	if (!speed) return "Unknown";

	const speedLabels: Record<string, string> = {
		ultraBullet: "Ultra Bullet",
		bullet: "Bullet",
		blitz: "Blitz",
		rapid: "Rapid",
		classical: "Classical",
		correspondence: "",
	};

	return speedLabels[speed] || speed;
}

/**
 * Normalizes clock values to seconds.
 * - GameJsonClock (exported games): values are already in seconds
 * - GameFullEventClock (live streams): values are in milliseconds
 *
 * Auto-detects the unit based on initial value:
 * If initial > 3600, assume milliseconds (otherwise would be 60+ minutes)
 */
export function normalizeClockToSeconds(
	clock: GameJsonClock | { initial?: number; increment?: number } | null | undefined,
): { initial: number; increment: number } | null {
	if (!clock || !clock.initial) return null;

	const isMilliseconds = clock.initial > 3600;

	if (isMilliseconds) {
		// GameFullEventClock: convert milliseconds to seconds
		return {
			initial: clock.initial / 1000,
			increment: (clock.increment || 0) / 1000,
		};
	} else {
		// GameJsonClock: already in seconds
		return {
			initial: clock.initial,
			increment: clock.increment || 0,
		};
	}
}

export function formatTimeControl(
	clock: { initial: number; increment: number } | null | undefined,
): string {
	if (!clock || !clock.initial) return "Unlimited";

	// Input is now guaranteed to be in seconds
	const minutes = Math.floor(clock.initial / 60);
	const seconds = Math.floor(clock.initial % 60);
	const increment = Math.floor(clock.increment);

	if (seconds > 0) {
		return `${minutes}:${seconds.toString().padStart(2, "0")}+${increment}`;
	}

	return `${minutes}+${increment}`;
}

export function formatOpening(opening: GameOpening | undefined): string | null {
	if (!opening?.name) return null;
	return opening.eco ? `${opening.eco}: ${opening.name}` : opening.name;
}

export function getGameModeDescription(
	speed: Speed | string | undefined,
	rated: boolean | undefined,
	clock: GameJsonClock | { initial?: number; increment?: number } | null | undefined,
): string {
	const parts: string[] = [];

	// Rated/Casual
	parts.push(rated ? "Rated" : "Casual");

	// Speed
	const speedStr = formatSpeed(speed);
	if (speedStr !== "Unknown") {
		parts.push(speedStr);
	}

	// Time control
	const normalizedClock = normalizeClockToSeconds(clock);
	const timeControl = formatTimeControl(normalizedClock);
	if (timeControl !== "Unlimited") {
		parts.push(`(${timeControl})`);
	}

	return parts.join(" ");
}

export function getGameModeLabel(
	speed: Speed | string | undefined,
	rated: boolean | undefined,
): string {
	const parts: string[] = [];

	if (rated !== undefined) {
		parts.push(rated ? "Rated" : "Unrated");
	}

	const speedStr = formatSpeed(speed);
	if (speedStr !== "Unknown") {
		parts.push(speedStr);
	}

	return parts.join(" ") || "Chess";
}
