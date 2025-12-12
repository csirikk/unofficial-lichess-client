import { useId, useState } from "react";
import { Button } from "./Button";
import { SectionLabel } from "./SectionLabel";
import { SegmentedControl, type SegmentedOption } from "./SegmentedControl";
import { SelectableCardGrid } from "./TimeControlGrid";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
	type SetupBotLevel,
	type SetupColorChoice,
	BOT_LEVELS,
	getDefaultTimePresetsForMode,
	createDefaultBotGameSetup,
	findTimePreset,
} from "../features/game/model/setup";
import { type GameSetup, createDefaultGameSetup } from "../features/game/model/setup";

const colorOptions: SegmentedOption<SetupColorChoice>[] = [
	{ value: "white", label: "White" },
	{ value: "random", label: "Random" },
	{ value: "black", label: "Black" },
];

const mapPresetItems = (
	presets: {
		id: string;
		label: string;
		subtitle: string;
		limitSeconds: number;
		incrementSeconds: number;
	}[],
) =>
	presets.map((p) => ({
		id: p.id,
		preset: p.label,
		speedBucket: p.subtitle,
		limitSeconds: p.limitSeconds,
		incrementSeconds: p.incrementSeconds,
	}));

type TabProps = {
	children?: React.ReactNode;
	className?: string;
};

export function Tab({ children, className }: TabProps) {
	return <div className={className}>{children}</div>;
}

const panelBase = "rounded-2xl  px-2 py-4";
const panelHeader = "mb-4 flex items-start justify-between gap-3";
const panelTitle = "text-lg font-semibold text-[rgb(var(--color-fg-primary))]";
const panelSubtitle = "mt-0.5 text-sm text-[rgb(var(--color-fg-secondary))]";

type PanelProps = {
	title?: string;
	subtitle?: string;
	actions?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
};

function Panel({ title, subtitle, actions, children, className = "" }: PanelProps) {
	return (
		<section className={`${panelBase} ${className}`}>
			{(title || subtitle || actions) && (
				<header className={panelHeader}>
					<div>
						{title && <h2 className={panelTitle}>{title}</h2>}
						{subtitle && <p className={panelSubtitle}>{subtitle}</p>}
					</div>
					{actions && <div className="shrink-0">{actions}</div>}
				</header>
			)}
			<div>{children}</div>
		</section>
	);
}

type TimeControlItem = {
	id: string;
	preset: string;
	speedBucket: string;
	limitSeconds: number;
	incrementSeconds: number;
};

function TimeControl({
	value,
	items,
	onChange,
	isExpanded,
	setIsExpanded,
}: {
	value: string;
	items: TimeControlItem[];
	onChange: (id: string) => void;
	isExpanded: boolean;
	setIsExpanded: (v: boolean) => void;
}) {
	return (
		<div>
			<SectionLabel>Time Control</SectionLabel>

			<div
				className={`overflow-hidden transition-all duration-500 ease-in-out relative ${
					isExpanded ? "max-h-106" : "max-h-60"
				}`}
			>
				<SelectableCardGrid
					value={value}
					items={items}
					onChange={onChange}
					scrollable={isExpanded}
				/>
			</div>

			<div className="mt-3 flex justify-center">
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="cursor-pointer flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--color-fg-secondary))] hover:text-[rgb(var(--color-primary-500))] transition-colors focus:outline-none"
				>
					{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
				</button>
			</div>
		</div>
	);
}

type BotTabProps = {
	isCreating: boolean;
	error: string | null;
	onStart: (config: {
		level: SetupBotLevel;
		clock: { limit: number; increment: number } | null;
		color: SetupColorChoice;
	}) => void;
};

export function BotTab({ isCreating, error, onStart }: BotTabProps) {
	const [setup, setSetup] = useState(createDefaultBotGameSetup);
	const [isTimeExpanded, setIsTimeExpanded] = useState(false);

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

		const isUnlimited = preset.limitSeconds === 0 && preset.incrementSeconds === 0;

		onStart({
			level: setup.botLevel,
			clock: isUnlimited
				? null
				: { limit: preset.limitSeconds, increment: preset.incrementSeconds },
			color: setup.colorChoice,
		});
	};

	const minLevel = BOT_LEVELS[0].level;
	const maxLevel = BOT_LEVELS[BOT_LEVELS.length - 1].level;
	const currentLevel = BOT_LEVELS.find((l) => l.level === setup.botLevel) ?? BOT_LEVELS[0];

	const inputId = useId();

	return (
		<Panel
			title="Play against Bot"
			subtitle="Choose difficulty, time control and the color you want to play."
			className="rounded-b-md rounded-t-none"
		>
			<div className="space-y-2">
				{error && (
					<div
						className="rounded-lg bg-[rgb(var(--color-error)/0.1)] p-4 text-sm text-[rgb(var(--color-error))]"
						role="alert"
					>
						{error}
					</div>
				)}

				<div className="flex gap-6 items-start">
					<div className="shrink-0 pb-2">
						<SectionLabel>Play as</SectionLabel>
						<SegmentedControl
							value={setup.colorChoice}
							options={colorOptions}
							onChange={handleColorChange}
						/>
					</div>

					<div className="flex-1 pr-2">
						<SectionLabel hint={`${currentLevel.label}`}>
							<label htmlFor={`bot-level-${inputId}`}>Bot strength</label>
						</SectionLabel>

						<div className="space-y-3 h-1">
							<input
								id={`bot-level-${inputId}`}
								type="range"
								min={minLevel}
								max={maxLevel}
								step={1}
								value={setup.botLevel}
								onChange={(e) => handleLevelChange(e.target.value)}
								className="w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgb(var(--color-primary-500))] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[rgb(var(--color-primary-500))] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[rgb(var(--color-surface-card))] [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:-mt-2.5 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[rgb(var(--color-primary-500))] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[rgb(var(--color-surface-card))] [&::-moz-range-thumb]:shadow-sm [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[rgb(var(--color-surface-border)/0.7)] [&::-moz-range-track]:h-1 [&::-moz-range-track]:w-full [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[rgb(var(--color-surface-border)/0.7)]"
							/>
							<div className="flex mx-[5px] justify-between mt-1 text-sm text-[rgb(var(--color-fg-secondary))]">
								{BOT_LEVELS.map((level) => {
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

				<TimeControl
					value={setup.timePresetId}
					items={mapPresetItems(getDefaultTimePresetsForMode("bot"))}
					onChange={handleTimeChange}
					isExpanded={isTimeExpanded}
					setIsExpanded={setIsTimeExpanded}
				/>

				<div className="pt-2">
					<Button variant="primary" size="lg" fullWidth onClick={handleStart} disabled={isCreating}>
						{isCreating ? "Starting…" : "Start Game"}
					</Button>
				</div>
			</div>
		</Panel>
	);
}

type OnlineTabBaseProps = {
	isCreating: boolean;
	waitingForGame: boolean;
	error: string | null;
	onStart: (setup: GameSetup) => void;
	onCancel: () => void;
};

function OnlineTab({
	isCreating,
	waitingForGame,
	error,
	onStart,
	onCancel,
	rated,
}: OnlineTabBaseProps & { rated: boolean }) {
	const [setup, setSetup] = useState(createDefaultGameSetup);
	const [isTimeExpanded, setIsTimeExpanded] = useState(false);

	const handleTimeChange = (id: string) => {
		setSetup((prev) => ({ ...prev, timePresetId: id }));
	};

	const handleColorChange = (color: SetupColorChoice) => {
		setSetup((prev) => ({ ...prev, colorChoice: color }));
	};

	const handleButtonClick = () => {
		if (waitingForGame) {
			onCancel();
		} else {
			onStart({ ...setup, rated });
		}
	};

	const isDisabled = isCreating;
	const buttonText = waitingForGame ? "Cancel" : isCreating ? "Creating seek…" : "Find Opponent";
	const buttonVariant = waitingForGame ? "outline" : "primary";

	return (
		<Panel
			title={`Play ${rated ? "Rated" : "Unrated"} Online`}
			subtitle="Play against a random opponent with similar rating."
			className="rounded-b-md rounded-t-none"
		>
			<div className="space-y-2">
				{error && (
					<div
						className="rounded-lg bg-[rgb(var(--color-error)/0.1)] p-4 text-sm text-[rgb(var(--color-error))]"
						role="alert"
					>
						{error}
					</div>
				)}

				<div className="flex gap-6 items-start">
					<div className="shrink-0 pb-2">
						<SectionLabel>Preferred color</SectionLabel>
						<SegmentedControl
							value={setup.colorChoice}
							options={colorOptions}
							onChange={handleColorChange}
						/>
					</div>
					{/* No slider */}
				</div>

				<TimeControl
					value={setup.timePresetId}
					items={mapPresetItems(getDefaultTimePresetsForMode(rated ? "rated" : "unrated"))}
					onChange={handleTimeChange}
					isExpanded={isTimeExpanded}
					setIsExpanded={setIsTimeExpanded}
				/>

				<div className="pt-2">
					<Button
						variant={buttonVariant}
						size="lg"
						fullWidth
						onClick={handleButtonClick}
						disabled={isDisabled}
					>
						{buttonText}
					</Button>
					{waitingForGame && (
						<p className="mt-2 text-sm text-center text-[rgb(var(--color-fg-secondary))]">
							Looking for a player near your rating...
						</p>
					)}
				</div>
			</div>
		</Panel>
	);
}

export function RatedTab(props: OnlineTabBaseProps) {
	return <OnlineTab {...props} rated={true} />;
}

export function UnratedTab(props: OnlineTabBaseProps) {
	return <OnlineTab {...props} rated={false} />;
}
