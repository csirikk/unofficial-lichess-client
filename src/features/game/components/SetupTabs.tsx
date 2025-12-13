/**
 * SetupTabs.tsx
 *
 * Tabs and Cards for creating local, bot or online game setups.
 */

import { useId } from "react";
import { ChevronDown, ChevronUp, RotateCw } from "lucide-react";
import { useBotSetup, useOnlineSetup } from "../hooks/useGameSetup";
import {
	BOT_LEVELS,
	type SetupBotLevel,
	type SetupColorChoice,
	MIN_RATED_MINUTES,
	MIN_UNRATED_MINUTES,
	MIN_BOT_MINUTES,
	type GameSetup,
	type TimePreset,
} from "../model/setup";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { IconButton } from "../../../components/IconButton";
import { SectionLabel } from "../../../components/SectionLabel";
import { SegmentedControl, type SegmentedOption } from "../../../components/SegmentedControl";
import { SelectableCardGrid } from "./TimeControlGrid";

const colorOptions: SegmentedOption<SetupColorChoice>[] = [
	{ value: "white", label: "White" },
	{ value: "random", label: "Random" },
	{ value: "black", label: "Black" },
];

const mapPresetItems = (presets: TimePreset[]) =>
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

type TimeControlItem = {
	id: string;
	preset: string;
	speedBucket: string;
	limitSeconds: number;
	incrementSeconds: number;
};

function CustomTimeControlInput({
	limit,
	increment,
	onChange,
	onSelect,
	isActive,
}: {
	limit: number;
	increment: number;
	onChange: (limit: number, increment: number) => void;
	onSelect: () => void;
	isActive: boolean;
}) {
	const minutes = limit / 60;

	const activeClasses = isActive
		? "border-[rgb(var(--color-primary-500))] bg-[rgb(var(--color-primary-500)/0.05)] shadow-sm"
		: "border-[rgb(var(--color-surface-border))] bg-[rgb(var(--color-surface-base)/0.5)] hover:border-[rgb(var(--color-primary-500)/0.3)]";

	return (
		<button
			type="button"
			tabIndex={0}
			onClick={onSelect}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect();
				}
			}}
			className={`mt-4 text-left rounded-lg border-2 p-4 transition-colors duration-200 cursor-pointer w-full ${activeClasses}`}
		>
			<div className="flex w-full justify-between items-center mb-1">
				<span className="text-lg font-semibold uppercase tracking-wide text-[rgb(var(--color-fg-primary))]">
					Custom
				</span>

				<span
					className={`text-2xl font-semibold shrink-0 ${
						isActive
							? "text-[rgb(var(--color-primary-700))]"
							: "text-[rgb(var(--color-fg-primary))]"
					}`}
				>
					{limit === 0 && increment === 0 ? "∞" : `${Math.floor(limit / 60)}+${increment}`}
				</span>
			</div>
			<div className="flex gap-4">
				<div className="flex-1">
					<label className="block">
						<div className="block text-sm font-medium text-[rgb(var(--color-fg-secondary))] mb-1">
							Starting time in minutes
						</div>
						<input
							type="number"
							min={0}
							max={180}
							step={1}
							value={minutes}
							onChange={(e) => onChange(Number(e.target.value) * 60, increment)}
							onFocus={onSelect}
							className="w-full px-3 py-2 rounded-md bg-[rgb(var(--color-surface-card))] border border-[rgb(var(--color-surface-border))] text-[rgb(var(--color-fg-primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-500))]"
						/>
					</label>
				</div>
				<div className="flex-1">
					<label className="block">
						<div className="block text-sm font-medium text-[rgb(var(--color-fg-secondary))] mb-1">
							Seconds added per move
						</div>
						<input
							type="number"
							min={0}
							max={180}
							value={increment}
							onChange={(e) => onChange(limit, Number(e.target.value))}
							onFocus={onSelect}
							className="w-full px-3 py-2 rounded-md bg-[rgb(var(--color-surface-card))] border border-[rgb(var(--color-surface-border))] text-[rgb(var(--color-fg-primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-500))]"
						/>
					</label>
				</div>
			</div>
		</button>
	);
}

function TimeControl({
	value,
	items,
	onChange,
	isExpanded,
	setIsExpanded,
	customValues,
	onCustomChange,
}: {
	value: string;
	items: TimeControlItem[];
	onChange: (id: string) => void;
	isExpanded: boolean;
	setIsExpanded: (v: boolean) => void;
	customValues?: { limit: number; increment: number };
	onCustomChange?: (limit: number, increment: number) => void;
}) {
	const isCustomActive = value === "custom";
	const handleCustomInputChange = (limit: number, increment: number) => {
		if (onCustomChange) {
			onCustomChange(limit, increment);
			onChange("custom");
		}
	};

	return (
		<div>
			<SectionLabel>Time Control</SectionLabel>

			<div
				className={`overflow-hidden transition-all duration-500 ease-in-out relative ${
					isExpanded ? "max-h-150" : "max-h-60"
				}`}
			>
				<SelectableCardGrid
					value={value}
					items={items}
					onChange={onChange}
					scrollable={isExpanded}
				/>
				{customValues && onCustomChange && (
					<CustomTimeControlInput
						limit={customValues.limit}
						increment={customValues.increment}
						onChange={handleCustomInputChange}
						onSelect={() => onChange("custom")}
						isActive={isCustomActive}
					/>
				)}
			</div>

			<div className="flex items-center">
				<div className="flex-1 border-t border-[rgb(var(--color-surface-border))]" />
				<IconButton
					size="lg"
					variant="ghost"
					aria-label={isExpanded ? "Collapse time control" : "Expand time control"}
					onClick={() => setIsExpanded(!isExpanded)}
					className="text-[rgb(var(--color-fg-secondary))] hover:text-[rgb(var(--color-primary-500))] transition-colors"
				>
					{isExpanded ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
				</IconButton>
				<div className="flex-1 border-t border-[rgb(var(--color-surface-border))]" />
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
	isTimeExpanded: boolean;
	setIsTimeExpanded: (expanded: boolean) => void;
};

export function BotTab({
	isCreating,
	error,
	onStart,
	isTimeExpanded,
	setIsTimeExpanded,
}: BotTabProps) {
	const { setup, presets: modePresets, isValid, handlers } = useBotSetup(onStart);

	const minLevel = BOT_LEVELS[0].level;
	const maxLevel = BOT_LEVELS[BOT_LEVELS.length - 1].level;
	const currentLevel = BOT_LEVELS.find((l) => l.level === setup.botLevel) ?? BOT_LEVELS[0];

	const inputId = useId();

	const BOT_LEVEL_ELO: Record<number, string> = {
		1: "~400 elo",
		2: "~800 elo",
		3: "~1100 elo",
		4: "~1400 elo",
		5: "~1700 elo",
		6: "~2000 elo",
		7: "~2300 elo",
		8: "~2500 elo",
	};

	return (
		<Card
			title="Play against Bot"
			subtitle="Choose difficulty, time control and the color you want to play."
			className="rounded-b-md rounded-t-none bg-transparent border-transparent"
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

				<div className="flex gap-4 items-start">
					<div className="shrink-0 pb-2">
						<SectionLabel>Play as</SectionLabel>
						<SegmentedControl
							value={setup.colorChoice}
							options={colorOptions}
							onChange={handlers.setColor}
						/>
					</div>

					<div className="flex-1">
						<SectionLabel hint={`${BOT_LEVEL_ELO[currentLevel.level]}`}>
							<label htmlFor={`bot-level-${inputId}`}>Bot strength</label>
						</SectionLabel>

						<div className="space-y-3 h-2">
							<input
								id={`bot-level-${inputId}`}
								type="range"
								min={minLevel}
								max={maxLevel}
								step={1}
								value={setup.botLevel}
								onChange={(e) => handlers.setLevel(e.target.value)}
								className="w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none 
								focus-visible:ring-1 focus-visible:ring-[rgb(var(--color-primary-500))] 
								[&::-webkit-slider-thumb]:appearance-none
								[&::-webkit-slider-thumb]:size-6 
								[&::-webkit-slider-thumb]:rounded-full
								[&::-webkit-slider-thumb]:bg-[rgb(var(--color-primary-500))] 
								[&::-webkit-slider-thumb]:border
								[&::-webkit-slider-thumb]:border-[rgb(var(--color-surface-card))] 
								[&::-webkit-slider-thumb]:shadow-sm
								[&::-webkit-slider-thumb]:-mt-2.5
								[&::-moz-range-thumb]:size-4 
								[&::-moz-range-thumb]:rounded-full
								[&::-moz-range-thumb]:bg-[rgb(var(--color-primary-500))]
								[&::-moz-range-thumb]:border
								[&::-moz-range-thumb]:border-[rgb(var(--color-surface-card))]
								[&::-moz-range-thumb]:shadow-sm
								[&::-webkit-slider-runnable-track]:w-full
								[&::-webkit-slider-runnable-track]:h-1.5
								[&::-webkit-slider-runnable-track]:rounded-full
								[&::-webkit-slider-runnable-track]:bg-[rgb(var(--color-surface-border)/0.7)]
								[&::-moz-range-track]:h-1
								[&::-moz-range-track]:w-full
								[&::-moz-range-track]:rounded-full
								[&::-moz-range-track]:bg-[rgb(var(--color-surface-border)/0.7)]"
							/>
							<div className="flex mx-[5px] justify-between mt-1 text-xl text-[rgb(var(--color-fg-secondary))]">
								{BOT_LEVELS.map((level) => {
									const isActive = level.level === setup.botLevel;
									return (
										<button
											key={level.level}
											type="button"
											onClick={() => handlers.setLevel(String(level.level))}
											className={`cursor-pointer w-3.5 flex flex-col items-center gap-1 focus-visible:outline-none ${
												isActive ? "text-[rgb(var(--color-primary-500))]" : ""
											}`}
										>
											<div
												className={`block h-1 w-px rounded-full ${
													isActive
														? "bg-[rgb(var(--color-primary-500))]"
														: "bg-[rgb(var(--color-surface-border)/0.9)]"
												}`}
											/>
											<div className="font-medium">{level.level}</div>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</div>

				<TimeControl
					value={setup.timePresetId}
					items={mapPresetItems(modePresets)}
					onChange={handlers.setTimePreset}
					isExpanded={isTimeExpanded}
					setIsExpanded={setIsTimeExpanded}
					customValues={setup.timeControl}
					onCustomChange={handlers.setCustomTime}
				/>

				<div className="pt-2">
					<Button
						variant="primary"
						size="lg"
						fullWidth
						onClick={handlers.startGame}
						disabled={isCreating || !isValid}
					>
						{isCreating && <RotateCw className="h-5 w-5 mr-2 animate-spin" />}
						{isCreating ? "Starting…" : isValid ? "Start Game" : "Invalid Time Control"}
					</Button>
					{!isValid && (
						<p className="mt-2 text-sm text-center text-[rgb(var(--color-error))]">
							Bot games must be {MIN_BOT_MINUTES} minutes or longer.
						</p>
					)}
				</div>
			</div>
		</Card>
	);
}

type OnlineTabBaseProps = {
	isCreating: boolean;
	waitingForGame: boolean;
	error: string | null;
	onStart: (setup: GameSetup) => void;
	onCancel: () => void;
	isTimeExpanded: boolean;
	setIsTimeExpanded: (expanded: boolean) => void;
};

function OnlineTab({
	isCreating,
	waitingForGame,
	error,
	onStart,
	onCancel,
	rated,
	isTimeExpanded,
	setIsTimeExpanded,
}: OnlineTabBaseProps & { rated: boolean }) {
	const {
		setup,
		presets: modePresets,
		isValid,
		handlers,
	} = useOnlineSetup(rated, onStart, onCancel, waitingForGame);

	const isDisabled = isCreating;
	const buttonText = waitingForGame
		? "Finding opponent"
		: isCreating
			? "Creating seek…"
			: "Find Opponent";
	const buttonVariant = waitingForGame ? "outline" : "primary";

	return (
		<Card
			title={`Play ${rated ? "Rated" : "Unrated"} Online`}
			subtitle="Play against a random opponent with similar rating."
			className={"rounded-b-md rounded-t-none bg-transparent border-transparent"}
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
							onChange={handlers.setColor}
						/>
					</div>
					{/* No slider */}
				</div>

				<TimeControl
					value={setup.timePresetId}
					items={mapPresetItems(modePresets)}
					onChange={handlers.setTimePreset}
					isExpanded={isTimeExpanded}
					setIsExpanded={setIsTimeExpanded}
					customValues={setup.timeControl}
					onCustomChange={handlers.setCustomTime}
				/>

				<div className="pt-2">
					<Button
						variant={buttonVariant}
						size="lg"
						fullWidth
						onClick={handlers.handleAction}
						disabled={isDisabled || (!waitingForGame && !isValid)}
					>
						{(waitingForGame || isCreating) && <RotateCw className="h-5 w-5 mr-2 animate-spin" />}
						{buttonText}
					</Button>
					{!waitingForGame && !isValid && (
						<p className="mt-2 text-sm text-center text-[rgb(var(--color-error))]">
							{rated
								? `Rated games must be ${MIN_RATED_MINUTES} minutes or longer.`
								: `Unrated games must be ${MIN_UNRATED_MINUTES} minutes or longer.`}
						</p>
					)}
				</div>
			</div>
		</Card>
	);
}

export function RatedTab(props: OnlineTabBaseProps) {
	return <OnlineTab {...props} rated={true} />;
}

export function UnratedTab(props: OnlineTabBaseProps) {
	return <OnlineTab {...props} rated={false} />;
}
