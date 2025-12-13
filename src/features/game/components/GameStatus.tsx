/**
 * GameStatus.tsx
 *
 * Display of current game status, mode, time control and connection state.
 */

import { Clock, ChessPawn, ChessKing } from "lucide-react";
import { ConnectionStatus } from "./ConnectionStatus";
import type { GameStatusModel, GameInfoModel, NetworkModel } from "../model/types";

export type GameStatusProps = {
	status: GameStatusModel;
	info: GameInfoModel;
	network: NetworkModel;
	className?: string;
};

export function GameStatus({ status, info, network, className = "" }: GameStatusProps) {
	const gameInfoItems = [
		{ icon: ChessKing, label: info.gameModeLabel, hidden: !info.gameModeLabel },
		{ icon: Clock, label: info.timeControlLabel, hidden: !info.timeControlLabel },
		{
			icon: ChessPawn,
			label: info.opening?.name ?? "",
			hidden: !info.opening?.name,
		},
	];

	return (
		<div className={`mb-2 shrink-0 ${className}`}>
			<div
				className={`text-4xl font-semibold ${
					status.isOver ? status.outcomeColorClass : "text-[rgb(var(--color-fg-secondary))]"
				}`}
			>
				<span className="uppercase tracking-wide">
					{status.isOver ? status.outcomeLabel : status.statusShort || "Unknown"}
				</span>
			</div>

			<div className="text-sm font-medium">
				{status.isOver ? (
					<span className="text-[rgb(var(--color-fg-secondary))]">{status.statusText}</span>
				) : (
					<ConnectionStatus network={network} />
				)}
			</div>

			{/* Game Info Tags */}
			{gameInfoItems.length > 0 && (
				<div className="mt-3 grid gap-2">
					{gameInfoItems.map((item, index) => (
						<div
							key={`${item.label}-${index}`}
							className={`flex items-center w-fit gap-1.5
							px-2 py-1 rounded-md bg-[rgb(var(--color-neutral-400)/0.1)] 
							text-[rgb(var(--color-fg-secondary))] hover:bg-[rgb(var(--color-neutral-400)/0.15)] 
							transition-colors ${item.hidden ? "invisible" : ""}`}
						>
							<item.icon className="h-3.5 w-3.5" />
							<span className="text-sm font-medium">{item.label}</span>
						</div>
					))}
				</div>
			)}

			{network.error ? (
				<div className="mt-2 text-xs text-[rgb(var(--color-error))]">Error: {network.error}</div>
			) : (
				<div className="mt-2 text-xs text-[rgb(var(--color-error))] invisible">Error</div>
			)}
		</div>
	);
}
