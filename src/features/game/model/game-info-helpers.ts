/**
 * game-info-helpers.ts
 *
 * Model helpers to derive displayable game info and status from raw events.
 */

import type { Speed } from "../../../generated/types/speed";
import type { VariantKey } from "../../../generated/types/variantKey";
import type { GameJsonClock } from "../../../generated/types/gameJsonClock";
import type { GameOpening } from "../../../generated/types/gameOpening";
import { GameStatusName } from "../../../generated/types/gameStatusName";
import type { GameFullEvent } from "../../../generated/types/gameFullEvent";
import type { GameJson } from "../../../generated/types/gameJson";
import type { GameStateEvent } from "../../../generated/types/gameStateEvent";
import type { GameColor as Color } from "../../../generated/types/gameColor";
import type {
	GameModel,
	PlayerModel,
	ClockModel,
	GameStatusModel,
	BoardModel,
	GameInfoModel,
	SpeedBucket,
} from "./types";
import type { Square } from "chess.js";
import { buildGameHistory, chessColorToGameColor } from "./chess";

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
	status: GameStatusName | null,
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

export function getGameStatusShort(status: GameStatusName | null): string {
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

export function formatSpeed(speed: Speed | string | undefined): SpeedBucket {
	if (!speed) return "rapid"; // Default fallback

	// Map known Speed values directly
	if (
		speed === "ultraBullet" ||
		speed === "bullet" ||
		speed === "blitz" ||
		speed === "rapid" ||
		speed === "classical" ||
		speed === "correspondence"
	) {
		return speed;
	}

	// Handle custom "unlimited" for UI
	if (speed === "unlimited") return "unlimited";

	// Fallback for unknown speeds
	return "rapid";
}

/**
 * Get human-readable label for speed category
 */
export function getSpeedLabel(speed: Speed | "unlimited" | undefined): string {
	if (!speed) return "";

	const speedLabels: Record<SpeedBucket, string> = {
		ultraBullet: "Ultra Bullet",
		bullet: "Bullet",
		blitz: "Blitz",
		rapid: "Rapid",
		classical: "Classical",
		correspondence: "Correspondence",
		unlimited: "Unlimited",
	};

	return speedLabels[speed] || "";
}

/**
 * Normalizes clock values to seconds.
 * - GameJsonClock (exported games): values are already in seconds
 * - GameFullEventClock (live streams): values are in milliseconds
 */
export function normalizeClockToSeconds(
	clock: GameJsonClock | { initial?: number; increment?: number } | null | undefined,
	isLiveStream: boolean = false,
): { initial: number; increment: number } | null {
	if (!clock || clock.initial == null) return null;

	const increment = clock.increment || 0;

	if (isLiveStream) {
		return {
			initial: clock.initial / 1000, // ms -> s
			increment: increment / 1000, // ms ->  s
		};
	} else {
		return {
			initial: clock.initial, // s
			increment: increment, // s
		};
	}
}

export function formatTimeControl(
	clock: { initial: number; increment: number } | null | undefined,
): string {
	if (!clock || clock.initial == null || clock.initial === 0) return "Unlimited";

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
	isLiveStream: boolean = false,
): string {
	const parts: string[] = [];

	// Rated/Casual
	parts.push(rated ? "Rated" : "Casual");

	// Speed
	const speedStr = formatSpeed(speed);
	const speedLabel = getSpeedLabel(speedStr);
	if (speedLabel) {
		parts.push(speedLabel);
	}

	// Time control
	const normalizedClock = normalizeClockToSeconds(clock, isLiveStream);
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
	const speedLabel = getSpeedLabel(speedStr);
	if (speedLabel) {
		parts.push(speedLabel);
	}

	return parts.join(" ") || "Chess";
}

export function deriveGameState(
	gameFull: GameFullEvent | null,
	gameState: GameStateEvent | null,
	myColor: "white" | "black" | null,
	clockState?: { whiteMs: number | null; blackMs: number | null; activeColor: "w" | "b" | null },
	ratingDeltas?: { white: number | null; black: number | null } | null,
	offers?: {
		drawOfferedByWhite?: boolean;
		drawOfferedByBlack?: boolean;
		takebackOfferedByWhite?: boolean;
		takebackOfferedByBlack?: boolean;
		rematchPending?: boolean;
		pendingChallengeId?: string | null;
	},
	gameJson?: GameJson | null,
	isLiveStream: boolean = true,
): GameModel | null {
	if (!gameFull) return null;

	const latestState = gameState ?? gameFull.state;
	const gameId = gameFull.id;

	const buildPlayer = (color: Color): PlayerModel => {
		const rawPlayer = color === "white" ? gameFull.white : gameFull.black;
		const isBot = rawPlayer?.aiLevel != null;

		const baseName = rawPlayer?.name || (isBot ? "Stockfish" : "Anonymous");
		const displayName = rawPlayer?.title ? `${rawPlayer.title} ${baseName}` : baseName;

		// Pre-format rating display string
		const rating = rawPlayer?.rating ?? (isBot && rawPlayer?.aiLevel ? rawPlayer.aiLevel * 300 : 0);
		const displayRating =
			isBot && rawPlayer?.aiLevel
				? `Level ${rawPlayer.aiLevel}`
				: rating > 0
					? rating.toString()
					: "?";

		return {
			id: rawPlayer?.id || `${color}-player`,
			username: baseName,
			displayName,
			rating,
			displayRating,
			title: rawPlayer?.title ?? undefined,
			avatarUrl: undefined,
			color,
			isBot,
			aiLevel: rawPlayer?.aiLevel,
		};
	};

	const whitePlayer = buildPlayer("white");
	const blackPlayer = buildPlayer("black");
	const mePlayer = myColor === "white" ? whitePlayer : myColor === "black" ? blackPlayer : null;
	const opponentPlayer =
		myColor === "white" ? blackPlayer : myColor === "black" ? whitePlayer : null;

	const normalizedClock = normalizeClockToSeconds(gameFull.clock ?? null, isLiveStream);
	const hasClockConfig = normalizedClock != null && normalizedClock.initial != null;
	const isUnlimited = !hasClockConfig;

	// Clock config (gameFull) in seconds, but clock state (whiteTime/blackTime) in milliseconds
	const initial = normalizedClock?.initial ?? 0;
	const increment = normalizedClock?.increment ?? 0;

	const clock: ClockModel = {
		initial,
		increment,
		isUnlimited,
		whiteTime: clockState?.whiteMs ?? null,
		blackTime: clockState?.blackMs ?? null,
		isActive: latestState?.status === GameStatusName.started,
		activeColor: clockState?.activeColor ? chessColorToGameColor(clockState.activeColor) : null,
	};

	const statusName = latestState?.status ?? GameStatusName.created;
	const isOver = statusName !== GameStatusName.started && statusName !== GameStatusName.created;
	const rawWinner = latestState?.winner;

	let winner: Color | "draw" | null = null;
	if (isOver) {
		winner = rawWinner === "white" || rawWinner === "black" ? rawWinner : "draw";
	}

	const outcome = getGameOutcome(winner === "draw" ? "" : winner, myColor);

	const status: GameStatusModel = {
		isOver,
		winner,
		condition: statusName,
		statusText: getGameStatusLong(statusName, rawWinner, myColor),
		statusShort: getGameStatusShort(statusName),
		outcomeLabel: getOutcomeLabel(outcome),
		outcomeColorClass: getOutcomeColorClass(outcome),
		outcomeGradient: getOutcomeGradient(outcome),
	};

	const moves = latestState?.moves ?? "";
	const initialFen =
		gameFull.initialFen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

	const { history, fen: derivedFen } = buildGameHistory(moves, initialFen);
	const fen = derivedFen;

	const lastMoveEntry = history.length > 0 ? history[history.length - 1] : undefined;
	const lastMove: { from: Square; to: Square } | undefined = lastMoveEntry
		? { from: lastMoveEntry.from as Square, to: lastMoveEntry.to as Square }
		: undefined;

	const board: BoardModel = {
		fen,
		orientation: myColor ?? "white",
		lastMove,
	};

	const speed = gameFull.speed ?? "correspondence";
	const rated = gameFull.rated ?? false;
	const variant = (gameFull.variant?.key ?? "standard") as VariantKey;
	const opening = gameJson?.opening;

	const info: GameInfoModel = {
		speed: formatSpeed(speed),
		rated,
		variant,
		opening: opening
			? {
					eco: opening.eco || "",
					name: opening.name || "",
				}
			: undefined,
		gameModeLabel: getGameModeLabel(speed, rated),
		timeControlLabel: formatTimeControl({
			initial: clock.initial,
			increment: clock.increment,
		}),
	};
	const offersStatus = {
		drawOfferedByWhite: offers?.drawOfferedByWhite ?? latestState?.wdraw ?? false,
		drawOfferedByBlack: offers?.drawOfferedByBlack ?? latestState?.bdraw ?? false,
		takebackOfferedByWhite: offers?.takebackOfferedByWhite ?? latestState?.wtakeback ?? false,
		takebackOfferedByBlack: offers?.takebackOfferedByBlack ?? latestState?.btakeback ?? false,
		rematchPending: offers?.rematchPending ?? false,
		pendingChallengeId: offers?.pendingChallengeId ?? null,
	};

	const ratingChanges = ratingDeltas
		? {
				white: ratingDeltas.white,
				black: ratingDeltas.black,
			}
		: undefined;

	return {
		id: gameId,
		players: {
			white: whitePlayer,
			black: blackPlayer,
			me: mePlayer,
			opponent: opponentPlayer,
		},
		clock,
		status,
		board,
		info,
		offers: offersStatus,
		ratingChanges,
	};
}
