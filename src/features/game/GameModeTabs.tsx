import { useState } from "react";
import { Card } from "../../components/Card";
import { SegmentedControl, type SegmentedOption } from "../../components/SegmentedControl";
import type { SetupBotLevel, SetupColorChoice } from "./logic/setup";
import { BotGameTab } from "./BotGameTab";

type GameMode = "bot" | "unrated" | "rated";

const modeOptions: SegmentedOption<GameMode>[] = [
	{ value: "bot", label: "Bots" },
	{ value: "unrated", label: "Unrated" },
	{ value: "rated", label: "Rated" },
];

type GameModeTabsProps = {
	isCreating: boolean;
	error: string | null;
	onStartBotGame: (config: {
		level: SetupBotLevel;
		clock: { limit: number; increment: number } | null;
		color: SetupColorChoice;
	}) => void;
};

export function GameModeTabs({ isCreating, error, onStartBotGame }: GameModeTabsProps) {
	const [mode, setMode] = useState<GameMode>("bot");

	return (
		<div className="flex flex-col gap-4 h-full justify-start">
			{/* Mode Selector */}
			<div className="shrink-0">
				<SegmentedControl value={mode} options={modeOptions} onChange={setMode} />
			</div>

			{/* Mode Content */}
			<div className="flex-1">
				{mode === "bot" && (
					<BotGameTab isCreating={isCreating} error={error} onStart={onStartBotGame} />
				)}

				{mode === "unrated" && (
					<Card title="Unrated Games">
						<p className="text-sm text-[rgb(var(--color-fg-secondary))] text-center">todo</p>
					</Card>
				)}

				{mode === "rated" && (
					<Card title="Rated Games">
						<p className="text-sm text-[rgb(var(--color-fg-secondary))] text-center">todo</p>
					</Card>
				)}
			</div>
		</div>
	);
}
