import { CircleX, Flag, Handshake, RotateCcw, Undo2, Play, type LucideIcon } from "lucide-react";
import { Button } from "../../../components/Button";

export type GameAction = {
	label: string;
	icon: LucideIcon;
	onClick: () => void;
	disabled: boolean;
	variant?: "ghost" | "default" | "outline" | "secondary";
	badge?: string;
};

export type ControlsProps = {
	onOfferDraw: () => void;
	onResign: () => void;
	onAbort: () => void;
	onTakeback: () => void;
	onRematch: () => void;
	onNewGame: () => void;
	onShowResults?: () => void;
	isConnected: boolean;
	gameEnded: boolean;
	moveCount: number;
	modalDismissed?: boolean;
	drawOfferedByMe?: boolean;
	drawOfferedByOpponent?: boolean;
	takebackOfferedByMe?: boolean;
	takebackOfferedByOpponent?: boolean;
	rematchPending?: boolean;
	isBotGame?: boolean;
};

export function Controls({
	onOfferDraw,
	onResign,
	onAbort,
	onTakeback,
	onRematch,
	onNewGame,
	onShowResults,
	isConnected,
	gameEnded,
	moveCount,
	modalDismissed = false,
	drawOfferedByMe = false,
	drawOfferedByOpponent = false,
	takebackOfferedByMe = false,
	takebackOfferedByOpponent = false,
	rematchPending = false,
	isBotGame = false,
}: ControlsProps) {
	if (gameEnded) {
		return (
			<div className="flex flex-col gap-3">
				{onShowResults && modalDismissed && (
					<Button variant="text" size="lg" fullWidth onClick={onShowResults}>
						Show Results
					</Button>
				)}
				<Button
					fullWidth
					size="lg"
					onClick={onRematch}
					disabled={rematchPending}
					aria-label="Rematch"
				>
					<RotateCcw className="h-5 w-5" aria-hidden />
					{rematchPending ? "Rematch Sent..." : "Rematch"}
				</Button>
				<Button variant="outline" size="lg" fullWidth onClick={onNewGame}>
					<Play className="h-5 w-5 fill-current" />
					New Game
				</Button>
			</div>
		);
	}

	const gameActions: GameAction[] = [
		...(!isBotGame
			? [
					{
						label: drawOfferedByOpponent
							? "Accept Draw"
							: drawOfferedByMe
								? "Draw Offered"
								: "Offer Draw",
						icon: Handshake,
						onClick: onOfferDraw,
						disabled: !isConnected || drawOfferedByMe,
						badge: drawOfferedByOpponent ? "!" : undefined,
					},
				]
			: []),
		{
			label: takebackOfferedByOpponent
				? "Accept Takeback"
				: takebackOfferedByMe
					? "Takeback Sent"
					: isBotGame
						? "Takeback"
						: "Request Takeback",
			icon: Undo2,
			onClick: onTakeback,
			disabled: !isConnected || takebackOfferedByMe || moveCount < 1,
			badge: takebackOfferedByOpponent ? "!" : undefined,
		},
		{
			label: "Resign",
			icon: Flag,
			onClick: onResign,
			disabled: !isConnected || moveCount < 2,
		},
		{
			label: "Abort",
			icon: CircleX,
			onClick: onAbort,
			disabled: !isConnected || moveCount >= 2,
		},
	];

	return (
		<div className="flex flex-col items-start justify-center gap-1 w-fit mt-2">
			{gameActions.map(({ label, icon: Icon, onClick, disabled, badge }) => (
				<Button
					key={label}
					variant="ghost"
					onClick={onClick}
					disabled={disabled}
					aria-label={label}
					title={label}
					className="flex-1 whitespace-nowrap relative"
				>
					<Icon className="h-5 w-5" aria-hidden />
					<span className="hidden sm:inline">{label}</span>
					{badge && (
						<span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-[rgb(var(--color-warning))] rounded-full">
							{badge}
						</span>
					)}
				</Button>
			))}
		</div>
	);
}
