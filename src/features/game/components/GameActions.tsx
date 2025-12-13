/**
 * GameActions.tsx
 *
 * Game action and control buttons (offer draw, resign, takeback, rematch, etc.).
 */

import { CircleX, Flag, Handshake, RotateCcw, Undo2, Play, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../components/Button";
import type { GameStatusModel, Offers, BothPlayersModel } from "../model/types";
import { GameColor as Color } from "../../../generated/types/gameColor";

export type GameAction = {
	label: string;
	icon: LucideIcon;
	onClick: (e?: React.MouseEvent) => void;
	disabled: boolean;
	variant?:
		| "primary"
		| "secondary"
		| "ghost"
		| "outline"
		| "danger"
		| "dangerr"
		| "text"
		| "uppercase";
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
	totalMoves: number;
	isModalDismissed?: boolean;
	offers: Offers;
	status: GameStatusModel;
	players: BothPlayersModel;
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
	totalMoves,
	isModalDismissed = false,
	offers,
	status,
	players,
}: ControlsProps) {
	const [resignConfirming, setResignConfirming] = useState(false);

	// Derive values from unified types
	const hasGameEnded = status.isOver;
	const myColor = players.me?.color;
	const isBotGame = players.opponent?.isBot ?? false;

	// Calculate offer states based on my color
	const hasDrawOfferedByMe = myColor
		? myColor === Color.white
			? offers.drawOfferedByWhite
			: offers.drawOfferedByBlack
		: false;
	const hasDrawOfferedByOpponent = myColor
		? myColor === Color.white
			? offers.drawOfferedByBlack
			: offers.drawOfferedByWhite
		: false;
	const hasTakebackOfferedByMe = myColor
		? myColor === Color.white
			? offers.takebackOfferedByWhite
			: offers.takebackOfferedByBlack
		: false;
	const hasTakebackOfferedByOpponent = myColor
		? myColor === Color.white
			? offers.takebackOfferedByBlack
			: offers.takebackOfferedByWhite
		: false;
	const isRematchPending = offers.rematchPending;

	// Reset resign confirmation when game ends or on any other action
	useEffect(() => {
		if (hasGameEnded) {
			setResignConfirming(false);
		}
	}, [hasGameEnded]);

	// Reset resign confirmation on any click outside
	useEffect(() => {
		if (!resignConfirming) return;

		const handleClickOutside = (e: MouseEvent) => {
			// Check if the click is on the resign button itself
			const target = e.target as HTMLElement;
			const resignButton = target.closest('button[aria-label*="Resign"]');
			if (!resignButton) {
				setResignConfirming(false);
			}
		};

		// Use a small delay to avoid immediate reset on the same click that set it
		const timeoutId = setTimeout(() => {
			document.addEventListener("click", handleClickOutside, { capture: true });
		}, 0);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener("click", handleClickOutside, { capture: true });
		};
	}, [resignConfirming]);

	const handleResignClick = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		if (resignConfirming) {
			onResign();
			setResignConfirming(false);
		} else {
			setResignConfirming(true);
		}
	};

	const handleOtherAction = (action: () => void) => {
		return (e?: React.MouseEvent) => {
			e?.stopPropagation();
			setResignConfirming(false);
			action();
		};
	};

	if (hasGameEnded) {
		return (
			<div className="flex flex-col gap-3">
				{onShowResults && isModalDismissed && (
					<Button variant="text" size="lg" fullWidth onClick={onShowResults}>
						Show Results
					</Button>
				)}
				<Button
					fullWidth
					size="lg"
					onClick={onRematch}
					disabled={isRematchPending}
					aria-label="Rematch"
				>
					<RotateCcw className="h-5 w-5" aria-hidden />
					{offers.pendingChallengeId
						? "Waiting for accept..."
						: isRematchPending
							? "Sending..."
							: "Rematch"}
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
						label: hasDrawOfferedByOpponent
							? "Accept Draw"
							: hasDrawOfferedByMe
								? "Draw Offered"
								: "Offer Draw",
						icon: Handshake,
						onClick: handleOtherAction(onOfferDraw),
						disabled: !isConnected || hasDrawOfferedByMe,
						badge: hasDrawOfferedByOpponent ? "!" : undefined,
					},
				]
			: []),
		{
			label: hasTakebackOfferedByOpponent
				? "Accept Takeback"
				: hasTakebackOfferedByMe
					? "Takeback Sent"
					: isBotGame
						? "Takeback"
						: "Request Takeback",
			icon: Undo2,
			onClick: handleOtherAction(onTakeback),
			disabled: !isConnected || hasTakebackOfferedByMe || totalMoves < 1,
			badge: hasTakebackOfferedByOpponent ? "!" : undefined,
		},
		{
			label: resignConfirming ? "Confirm Resign?" : "Resign",
			icon: Flag,
			onClick: handleResignClick,
			disabled: !isConnected || totalMoves < 2,
			variant: resignConfirming ? "dangerr" : undefined,
		},
		{
			label: "Abort",
			icon: CircleX,
			onClick: handleOtherAction(onAbort),
			disabled: !isConnected || totalMoves >= 2,
		},
	];

	return (
		<div className="flex flex-col items-start justify-center gap-1 w-fit mt-2">
			{gameActions.map(({ label, icon: Icon, onClick, disabled, variant, badge }) => (
				<Button
					key={label}
					variant={variant || "ghost"}
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
