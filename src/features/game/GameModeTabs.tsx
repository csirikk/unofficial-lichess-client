import { useState } from "react";
import { UiCard } from "../../components/ui/UiCard";
import { UiSegmentedControl, type UiSegmentedOption } from "../../components/ui/UiSegmentedControl";
import type { UiBotLevel, UiColorChoice } from "../../libs/gameSetup";
import { BotGameTab } from "./BotGameTab";

type GameMode = "bot" | "unrated" | "rated";

const modeOptions: UiSegmentedOption<GameMode>[] = [
	{ value: "bot", label: "Bots" },
	{ value: "unrated", label: "Unrated" },
	{ value: "rated", label: "Rated" },
];

type GameModeTabsProps = {
	isCreating: boolean;
	error: string | null;
	onStartBotGame: (config: {
		level: UiBotLevel;
		clock: { limit: number; increment: number } | null;
		color: UiColorChoice;
	}) => void;
};

export function GameModeTabs({ isCreating, error, onStartBotGame }: GameModeTabsProps) {
	const [mode, setMode] = useState<GameMode>("bot");

	return (
		<div className="space-y-4">
			{/* Mode Selector */}
			<UiSegmentedControl value={mode} options={modeOptions} onChange={setMode} />

			{/* Mode Content */}
			{mode === "bot" && (
				<BotGameTab isCreating={isCreating} error={error} onStart={onStartBotGame} />
			)}

			{mode === "unrated" && (
				<UiCard title="Unrated Games">
					<p className="text-sm text-[rgb(var(--color-fg-secondary))] text-center">todo</p>
				</UiCard>
			)}

			{mode === "rated" && (
				<UiCard title="Rated Games">
					<p className="text-sm text-[rgb(var(--color-fg-secondary))] text-center">todo</p>
				</UiCard>
			)}
		</div>
	);
}
