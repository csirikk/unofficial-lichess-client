import { CircleX, Flag, Handshake, type LucideIcon } from "lucide-react";

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
		<div className="flex flex-col gap-1 self-center">
			{gameActions.map(({ label, icon: Icon, onClick, disabled }) => (
				<button
					key={label}
					type="button"
					onClick={onClick}
					disabled={disabled}
					aria-label={label}
					title={label}
					className={`
						inline-flex items-center justify-center p-2 
						rounded-full transition 
						disabled:opacity-40 disabled:cursor-not-allowed 
						text-gray-500 hover:bg-[rgb(var(--color-surface-border)/0.1)] hover:text-[rgb(var(--color-fg-primary))]
						${disabled ? "hover:bg-transparent hover:text-gray-500" : ""}`}
				>
					<Icon className="h-6 w-6" aria-hidden />
				</button>
			))}
		</div>
	);
}
