import type { GameFullEvent } from "../generated/types/gameFullEvent";
import type { UserExtended } from "../generated/types/userExtended";
import { GameColor } from "../generated/types/gameColor";

export function getPlayerColor(
	gameFull: GameFullEvent | null,
	user: UserExtended | null,
): GameColor {
	if (!gameFull || !user) return GameColor.white;

	const userId = user.id?.toLowerCase();
	const whiteId = gameFull.white?.id?.toLowerCase();
	const blackId = gameFull.black?.id?.toLowerCase();

	if (userId && whiteId === userId) return GameColor.white;
	if (userId && blackId === userId) return GameColor.black;
	return GameColor.white;
}

export function isPlayerInGame(gameFull: GameFullEvent | null, user: UserExtended | null): boolean {
	if (!gameFull || !user) return false;

	const userId = user.id?.toLowerCase();
	const whiteId = gameFull.white?.id?.toLowerCase();
	const blackId = gameFull.black?.id?.toLowerCase();

	return Boolean(userId && (whiteId === userId || blackId === userId));
}

/**
 * UCI format: e2e4, e7e5, e7e8q (promotion)
 * chess.js format: { from: 'e2', to: 'e4', promotion?: 'q' }
 */
export function uciToMove(uci: string): {
	from: string;
	to: string;
	promotion?: string;
} {
	if (uci.length < 4) {
		throw new Error(`Invalid UCI move: ${uci}`);
	}

	const from = uci.substring(0, 2);
	const to = uci.substring(2, 4);
	const promotion = uci.length > 4 ? uci.substring(4, 5) : undefined;

	return { from, to, promotion };
}

/**
 * UCI format: e2e4, e7e5, e7e8q (promotion)
 * chess.js format: { from: 'e2', to: 'e4', promotion?: 'q' }
 */
export function moveToUci(move: { from: string; to: string; promotion?: string }): string {
	return `${move.from}${move.to}${move.promotion || ""}`;
}
