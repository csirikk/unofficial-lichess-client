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
		<div className="flex flex-row items-center justify-center gap-2 w-full mt-2">
			{gameActions.map(({ label, icon: Icon, onClick, disabled }) => (
				<button
					key={label}
					type="button"
					onClick={onClick}
					disabled={disabled}
					aria-label={label}
					title={label}
					className={`
						flex-1 inline-flex items-center justify-center gap-2 p-3 
						rounded-lg transition-colors border border-transparent
						text-sm font-medium
						disabled:opacity-40 disabled:cursor-not-allowed 
						text-[rgb(var(--color-fg-secondary))] 
						hover:bg-[rgb(var(--color-surface-border)/0.5)] 
						hover:text-[rgb(var(--color-fg-primary))]
						${disabled ? "hover:bg-transparent" : ""}`}
				>
					<Icon className="h-5 w-5" aria-hidden />
					<span className="hidden sm:inline">{label}</span>
				</button>
			))}
		</div>
	);
}
