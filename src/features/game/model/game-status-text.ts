import { GameStatusName } from "../../../generated/types/gameStatusName";

/**
 * @param status - The game status code
 * @param winner - The winning color, null for draw
 * @param myColor - The current player color
 */
export function getGameStatusLong(
	status: string | null,
	winner?: string | null,
	myColor?: string | null,
): string {
	if (!status) return "Game ended";

	// Determine who performed the action
	const isMyWin = myColor && winner === myColor;
	const isOpponentWin = myColor && winner && winner !== myColor;

	// Color labels
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
			return "Checkmate";
		case GameStatusName.resign:
			return "Resignation";
		case GameStatusName.stalemate:
			return "Stalemate";
		case GameStatusName.timeout:
			return "Timeout";
		case GameStatusName.draw:
			return "Draw";
		case GameStatusName.outoftime:
			return "Time Forfeit";
		case GameStatusName.cheat:
			return "Cheat Detected";
		case GameStatusName.noStart:
			return "Not Started";
		case GameStatusName.unknownFinish:
			return "Unknown Finish";
		case GameStatusName.insufficientMaterialClaim:
			return "Insufficient Material";
		case GameStatusName.variantEnd:
			return "Variant End";
		default:
			return status;
	}
}
