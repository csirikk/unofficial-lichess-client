import { useState } from "react";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { SectionLabel } from "../../../components/SectionLabel";
import { SegmentedControl, type SegmentedOption } from "../../../components/SegmentedControl";
import {
	type SetupBotLevel,
	type SetupColorChoice,
	UI_BOT_LEVELS,
	UI_TIME_PRESETS,
	createDefaultBotGameSetup,
	findTimePreset,
} from "../model/setup";
import { SelectableCardGrid } from "../../../components/SelectableCardGrid";

type BotGameTabProps = {
	isCreating: boolean;
	error: string | null;
	onStart: (config: {
		level: SetupBotLevel;
		clock: { limit: number; increment: number } | null;
		color: SetupColorChoice;
	}) => void;
};

const colorOptions: SegmentedOption<SetupColorChoice>[] = [
	{ value: "white", label: "White" },
	{ value: "random", label: "Random" },
	{ value: "black", label: "Black" },
];

export function BotGameTab({ isCreating, error, onStart }: BotGameTabProps) {
	const [setup, setSetup] = useState(createDefaultBotGameSetup);

	const handleLevelChange = (id: string) => {
		setSetup((prev) => ({ ...prev, botLevel: Number(id) as SetupBotLevel }));
	};

	const handleTimeChange = (id: string) => {
		setSetup((prev) => ({ ...prev, timePresetId: id }));
	};

	const handleColorChange = (color: SetupColorChoice) => {
		setSetup((prev) => ({ ...prev, colorChoice: color }));
	};

	const handleStart = () => {
		const preset = findTimePreset(setup.timePresetId);
		if (!preset) return;

		// Unlimited games pass null clock
		const isUnlimited = preset.limitSeconds === 0 && preset.incrementSeconds === 0;

		onStart({
			level: setup.botLevel,
			clock: isUnlimited
				? null
				: { limit: preset.limitSeconds, increment: preset.incrementSeconds },
			color: setup.colorChoice,
		});
	};

	const minLevel = UI_BOT_LEVELS[0].level;
	const maxLevel = UI_BOT_LEVELS[UI_BOT_LEVELS.length - 1].level;
	const currentLevel = UI_BOT_LEVELS.find((l) => l.level === setup.botLevel) ?? UI_BOT_LEVELS[0];

	return (
		<Card
			title="Play against Bot"
			subtitle="Choose difficulty, time control and the color you want to play."
		>
			<div className="space-y-5">
				{/* Bot Level */}
				<div>
					<SectionLabel hint={`${currentLevel.label}`}>Bot strength</SectionLabel>

					<div className="grid">
						<div className="space-y-3">
							<input
								id="bot-level"
								type="range"
								min={minLevel}
								max={maxLevel}
								step={1}
								value={setup.botLevel}
								onChange={(e) => handleLevelChange(e.target.value)}
								className="
								w-full cursor-pointer appearance-none
								bg-transparent
								focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgb(var(--color-primary-500))]

								[&::-webkit-slider-thumb]:appearance-none
								[&::-webkit-slider-thumb]:size-4
								[&::-webkit-slider-thumb]:rounded-full
								[&::-webkit-slider-thumb]:bg-[rgb(var(--color-primary-500))]
								[&::-webkit-slider-thumb]:border
								[&::-webkit-slider-thumb]:border-[rgb(var(--color-surface-card))]
								[&::-webkit-slider-thumb]:shadow-sm
								[&::-webkit-slider-thumb]:-mt-[6px]

								[&::-moz-range-thumb]:size-4
								[&::-moz-range-thumb]:rounded-full
								[&::-moz-range-thumb]:bg-[rgb(var(--color-primary-500))]
								[&::-moz-range-thumb]:border
								[&::-moz-range-thumb]:border-[rgb(var(--color-surface-card))]
								[&::-moz-range-thumb]:shadow-sm

                                [&::-webkit-slider-runnable-track]:w-full
                                [&::-webkit-slider-runnable-track]:h-1
								[&::-webkit-slider-runnable-track]:rounded-full
								[&::-webkit-slider-runnable-track]:bg-[rgb(var(--color-surface-border)/0.7)]

                                [&::-moz-range-track]:h-1
								[&::-moz-range-track]:w-full
								[&::-moz-range-track]:rounded-full
								[&::-moz-range-track]:bg-[rgb(var(--color-surface-border)/0.7)]

							"
							/>

							{/* Tick labels 1–8 under the slider */}
							<div className="flex mx-[5px] justify-between mt-1 text-sm text-[rgb(var(--color-fg-secondary))]">
								{UI_BOT_LEVELS.map((level) => {
									const isActive = level.level === setup.botLevel;
									return (
										<button
											key={level.level}
											type="button"
											onClick={() => handleLevelChange(String(level.level))}
											className={`cursor-pointer flex flex-col items-center gap-1 focus-visible:outline-none ${
												isActive ? "text-[rgb(var(--color-primary-500))]" : ""
											}`}
										>
											<span
												className={`block h-1 w-px rounded-full ${
													isActive
														? "bg-[rgb(var(--color-primary-500))]"
														: "bg-[rgb(var(--color-surface-border)/0.9)]"
												}`}
											/>
											<span className="font-medium">{level.level}</span>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</div>

				{/* Time Control */}
				<div>
					<SectionLabel>Time Control</SectionLabel>
					<SelectableCardGrid
						value={setup.timePresetId}
						items={UI_TIME_PRESETS.map((p) => ({
							id: p.id,
							title: p.label,
							subtitle: p.subtitle,
						}))}
						onChange={handleTimeChange}
					/>
				</div>

				{/* Color Choice */}
				<div>
					<SectionLabel>Play as</SectionLabel>
					<SegmentedControl
						value={setup.colorChoice}
						options={colorOptions}
						onChange={handleColorChange}
					/>
				</div>

				{/* Error */}
				{error && (
					<div
						className="rounded-lg bg-[rgb(var(--color-error)/0.1)] p-4 text-sm text-[rgb(var(--color-error))]"
						role="alert"
					>
						{error}
					</div>
				)}

				{/* Start Button */}
				<Button variant="primary" size="lg" fullWidth onClick={handleStart} disabled={isCreating}>
					{isCreating ? "Starting…" : "Start Game"}
				</Button>
			</div>
		</Card>
	);
}
