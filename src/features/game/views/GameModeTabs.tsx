import { useState } from "react";
import { SegmentedControl, type SegmentedOption } from "../../../components/SegmentedControl";
import type { GameSetup, SetupBotLevel, SetupColorChoice } from "../model/setup";
import { BotGameTab } from "./BotGameTab";
import { OnlineGameTab } from "./OnlineGameTab";

type GameMode = "bot" | "unrated" | "rated";

const modeOptions: SegmentedOption<GameMode>[] = [
	{ value: "bot", label: "Bots" },
	{ value: "unrated", label: "Unrated" },
	{ value: "rated", label: "Rated" },
];

type GameModeTabsProps = {
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

export function GameModeTabs({
	isCreating,
	waitingForGame,
	error,
	onStartBotGame,
	onStartOnlineGame,
	onCancelSeek,
}: GameModeTabsProps) {
	const [mode, setMode] = useState<GameMode>("bot");

	const handleModeChange = (newMode: GameMode) => {
		setMode(newMode);
	};

	return (
		<div className="flex flex-col gap-4 h-full justify-start">
			{/* Mode Selector */}
			<div className="shrink-0">
				<SegmentedControl value={mode} options={modeOptions} onChange={handleModeChange} />
			</div>

			{/* Mode Content */}
			<div className="flex-1">
				{mode === "bot" && (
					<BotGameTab isCreating={isCreating} error={error} onStart={onStartBotGame} />
				)}

				{(mode === "unrated" || mode === "rated") && (
					<OnlineGameTab
						isCreating={isCreating}
						waitingForGame={waitingForGame}
						error={error}
						rated={mode === "rated"}
						onStart={onStartOnlineGame}
						onCancel={onCancelSeek}
					/>
				)}
			</div>
		</div>
	);
}
