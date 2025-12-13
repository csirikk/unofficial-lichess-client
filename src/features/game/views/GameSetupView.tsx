/**
 * GameSetupView.tsx
 *
 * Main setup screen with tabs for creating bot, unrated, and rated games.
 * Orchestrates BotTab, RatedTab, and UnratedTab components. Used in GameView.
 */

import { useState } from "react";
import type { GameSetup, SetupBotLevel, SetupColorChoice } from "../model/setup";
import { BotTab, RatedTab, UnratedTab } from "../components/SetupTabs";

type GameMode = "bot" | "unrated" | "rated";

const TABS: { id: GameMode; label: string }[] = [
	{ id: "bot", label: "Bots" },
	{ id: "unrated", label: "Unrated" },
	{ id: "rated", label: "Rated" },
];

type GameSetupViewProps = {
	isCreating: boolean;
	waitingForGame: boolean;
	error: string | null;
	onStartBotGame: (config: {
		level: SetupBotLevel;
		clock: { limit: number; increment: number } | null;
		color: SetupColorChoice;
	}) => void;
	onStartOnlineGame: (setup: GameSetup) => void;
	onCancelSeek: () => void;
};

export function GameSetupView({
	isCreating,
	waitingForGame,
	error,
	onStartBotGame,
	onStartOnlineGame,
	onCancelSeek,
}: GameSetupViewProps) {
	const [mode, setMode] = useState<GameMode>("bot");
	const [isTimeExpanded, setIsTimeExpanded] = useState(false);

	return (
		<div className="flex flex-col justify-start">
			<div className="shrink-0">
				<div className="flex items-center border-b border-[rgb(var(--color-surface-border))]">
					{TABS.map((tab) => {
						const isActive = mode === tab.id;
						return (
							<button
								key={tab.id}
								onClick={() => setMode(tab.id)}
								type="button"
								className={`
									relative flex-1 pb-3 pt-2 text-lg font-semibold transition-colors duration-300
									-mb-px cursor-pointer
									${
										isActive
											? "text-[rgb(var(--color-primary-400))] border-b-2 border-[rgb(var(--color-primary-400))]"
											: "text-[rgb(var(--color-fg-secondary))] hover:text-[rgb(var(--color-fg-primary))] border-b-2 border-transparent"
									}`}
							>
								{tab.label}
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex-1">
				<div className="relative h-full overflow-hidden">
					<div
						className="flex h-full transition-transform duration-200 ease-in-out"
						style={{ transform: `translateX(-${TABS.findIndex((t) => t.id === mode) * 100}%)` }}
					>
						<div className="w-full shrink-0 h-full">
							<BotTab
								isCreating={isCreating}
								error={error}
								onStart={onStartBotGame}
								isTimeExpanded={isTimeExpanded}
								setIsTimeExpanded={setIsTimeExpanded}
							/>
						</div>

						<div className="w-full shrink-0 h-full">
							<UnratedTab
								isCreating={isCreating}
								waitingForGame={waitingForGame}
								error={error}
								onStart={onStartOnlineGame}
								onCancel={onCancelSeek}
								isTimeExpanded={isTimeExpanded}
								setIsTimeExpanded={setIsTimeExpanded}
							/>
						</div>

						<div className="w-full shrink-0 h-full">
							<RatedTab
								isCreating={isCreating}
								waitingForGame={waitingForGame}
								error={error}
								onStart={onStartOnlineGame}
								onCancel={onCancelSeek}
								isTimeExpanded={isTimeExpanded}
								setIsTimeExpanded={setIsTimeExpanded}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
