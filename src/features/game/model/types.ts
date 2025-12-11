/**
 * Type Definitions
 */

import type { PieceSymbol, Square } from "chess.js";
import type { Speed as ApiSpeed } from "../../../generated/types/speed";
import type { VariantKey as Variant } from "../../../generated/types/variantKey";
import type { GameStatusName as GameStatus } from "../../../generated/types/gameStatusName";
import type { Title } from "../../../generated/types/title";
import type { GameColor as Color } from "../../../generated/types/gameColor";

export type SpeedBucket = ApiSpeed | "unlimited";

export interface PlayerModel {
	id: string;
	username: string;
	displayName: string;
	rating: number;
	displayRating: string; // Formatted rating display (like "2850" or "Level 5")
	title?: Title;
	avatarUrl?: string;
	color: Color;
	isBot: boolean;
	aiLevel?: number;
}

export interface BothPlayersModel {
	white: PlayerModel;
	black: PlayerModel;
	me: PlayerModel | null;
	opponent: PlayerModel | null;
}

export interface ClockModel {
	// Static config
	initial: number; // seconds
	increment: number; // seconds
	isUnlimited: boolean;

	// Live state
	whiteTime: number | null; // milliseconds or null if unknown
	blackTime: number | null; // milliseconds or null if unknown
	isActive: boolean;
	activeColor: Color | null;
}

export interface GameStatusModel {
	isOver: boolean;
	winner: Color | "draw" | null;
	condition: GameStatus | null;
	statusText: string;
	statusShort: string;
	outcomeLabel: string;
	outcomeColorClass: string;
	outcomeGradient: string;
}

export interface GameInfoModel {
	speed: SpeedBucket;
	rated: boolean;
	gameModeLabel: string;
	timeControlLabel: string;
	variant: Variant;
	opening?: {
		eco: string;
		name: string;
	};
}

export interface RatingDeltas {
	white: number | null;
	black: number | null;
}

export interface Material {
	captured: { white: PieceSymbol[]; black: PieceSymbol[] };
	whiteDiff: number;
	blackDiff: number;
}

export interface Offers {
	drawOfferedByWhite: boolean;
	drawOfferedByBlack: boolean;
	takebackOfferedByWhite: boolean;
	takebackOfferedByBlack: boolean;
	rematchPending: boolean;
	pendingChallengeId?: string | null;
}

export interface GameModel {
	id: string;
	players: BothPlayersModel;
	clock: ClockModel;
	status: GameStatusModel;
	board: BoardModel;
	info: GameInfoModel;
	offers: Offers;
	ratingChanges?: RatingDeltas;
}

export interface BoardModel {
	fen: string;
	orientation: Color;
	lastMove?: {
		from: Square;
		to: Square;
	};
}

export interface NetworkModel {
	isConnected: boolean;
	isConnecting: boolean;
	isReconnecting: boolean;
	isOffline: boolean;
	isStreamNotFound: boolean;
	error?: string | null;
}
