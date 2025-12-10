import { useState } from "react";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { SectionLabel } from "../../../components/SectionLabel";
import { SegmentedControl, type SegmentedOption } from "../../../components/SegmentedControl";
import { SelectableCardGrid } from "../../../components/SelectableCardGrid";
import {
	type GameSetup,
	type SetupColorChoice,
	TIME_PRESETS,
	createDefaultGameSetup,
} from "../model/setup";

type OnlineGameTabProps = {
	isCreating: boolean;
	waitingForGame: boolean;
	error: string | null;
	rated: boolean;
	onStart: (setup: GameSetup) => void;
};

const colorOptions: SegmentedOption<SetupColorChoice>[] = [
	{ value: "white", label: "White" },
	{ value: "random", label: "Random" },
	{ value: "black", label: "Black" },
];

export function OnlineGameTab({
	isCreating,
	waitingForGame,
	error,
	rated,
	onStart,
}: OnlineGameTabProps) {
	const [setup, setSetup] = useState(createDefaultGameSetup);

	const handleTimeChange = (id: string) => {
		setSetup((prev) => ({ ...prev, timePresetId: id }));
	};

	const handleColorChange = (color: SetupColorChoice) => {
		setSetup((prev) => ({ ...prev, colorChoice: color }));
	};

	const handleStart = () => {
		onStart({ ...setup, rated });
	};

	const isDisabled = isCreating || waitingForGame;
	const buttonText = waitingForGame
		? "Waiting for opponent…"
		: isCreating
			? "Creating seek…"
			: "Find Opponent";

	const availablePresets = TIME_PRESETS.filter((p) => p.category !== "unlimited");

	return (
		<Card
			title={`Play ${rated ? "Rated" : "Unrated"} Online`}
			subtitle="Play against a random opponent with similar rating."
		>
			<div className="space-y-5">
				{/* Time Control */}
				<div>
					<SectionLabel>Time Control</SectionLabel>
					<SelectableCardGrid
						value={setup.timePresetId}
						items={availablePresets.map((p) => ({
							id: p.id,
							title: p.label,
							subtitle: p.subtitle,
						}))}
						onChange={handleTimeChange}
					/>
				</div>

				{/* Color Choice */}
				<div>
					<SectionLabel>Preferred color</SectionLabel>
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
				<Button variant="primary" size="lg" fullWidth onClick={handleStart} disabled={isDisabled}>
					{buttonText}
				</Button>

				{waitingForGame && (
					<p className="text-sm text-center text-[rgb(var(--color-fg-secondary))]">
						Looking for a player near your rating...
					</p>
				)}
			</div>
		</Card>
	);
}
