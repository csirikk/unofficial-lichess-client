/**
 * Game outcome utilities for consistent styling and logic
 */

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
