import { CircleX, Flag, Handshake, type LucideIcon } from "lucide-react";
import { Button } from "../../../components/Button";

export type GameAction = {
	label: string;
	icon: LucideIcon;
	onClick: () => void;
	disabled: boolean;
};

export type ControlsProps = {
	onOfferDraw: () => void;
	onResign: () => void;
	onAbort: () => void;
	isConnected: boolean;
	gameEnded: boolean;
	moveCount: number;
};

export function Controls({
	onOfferDraw,
	onResign,
	onAbort,
	isConnected,
	gameEnded,
	moveCount,
}: ControlsProps) {
	const gameActions: GameAction[] = [
		{
			label: "Offer draw",
			icon: Handshake,
			onClick: onOfferDraw,
			disabled: !isConnected || gameEnded,
		},
		{
			label: "Resign",
			icon: Flag,
			onClick: onResign,
			disabled: !isConnected || gameEnded,
		},
		{
			label: "Abort",
			icon: CircleX,
			onClick: onAbort,
			disabled: !isConnected || gameEnded || moveCount >= 2,
		},
	];

	return (
		<div className="flex flex-row items-center justify-center gap-2 w-full mt-2">
			{gameActions.map(({ label, icon: Icon, onClick, disabled }) => (
				<Button
					key={label}
					variant="ghost"
					onClick={onClick}
					disabled={disabled}
					aria-label={label}
					title={label}
					className="flex-1 whitespace-nowrap"
				>
					<Icon className="h-5 w-5" aria-hidden />
					<span className="hidden sm:inline">{label}</span>
				</Button>
			))}
		</div>
	);
}
