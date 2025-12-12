import type { SpeedBucket } from "./types";
import type { ChallengeColor } from "../../../generated/types/challengeColor";

export type TimeCategory = SpeedBucket;

export const MIN_RATED_MINUTES = 15;
export const MIN_UNRATED_MINUTES = 10;
export const MIN_BOT_MINUTES = 3;

export type TimePreset = {
	id: string;
	label: string;
	subtitle: string;
	limitSeconds: number;
	incrementSeconds: number;
	category: TimeCategory;
};

export const TIME_PRESETS: TimePreset[] = [
	// Unlimited
	{
		id: "unlimited",
		label: "∞",
		subtitle: "unlimited",
		limitSeconds: 0,
		incrementSeconds: 0,
		category: "unlimited",
	},
	// Bullet
	{
		id: "1+0",
		label: "1+0",
		subtitle: "bullet",
		limitSeconds: 60,
		incrementSeconds: 0,
		category: "bullet",
	},
	{
		id: "1+1",
		label: "1+1",
		subtitle: "bullet",
		limitSeconds: 60,
		incrementSeconds: 1,
		category: "bullet",
	},
	{
		id: "2+1",
		label: "2+1",
		subtitle: "bullet",
		limitSeconds: 120,
		incrementSeconds: 1,
		category: "bullet",
	},
	// Blitz
	{
		id: "3+0",
		label: "3+0",
		subtitle: "blitz",
		limitSeconds: 180,
		incrementSeconds: 0,
		category: "blitz",
	},
	{
		id: "3+2",
		label: "3+2",
		subtitle: "blitz",
		limitSeconds: 180,
		incrementSeconds: 2,
		category: "blitz",
	},
	{
		id: "5+0",
		label: "5+0",
		subtitle: "blitz",
		limitSeconds: 300,
		incrementSeconds: 0,
		category: "blitz",
	},
	{
		id: "5+3",
		label: "5+3",
		subtitle: "blitz",
		limitSeconds: 300,
		incrementSeconds: 3,
		category: "blitz",
	},
	// Rapid
	{
		id: "10+0",
		label: "10+0",
		subtitle: "rapid",
		limitSeconds: 600,
		incrementSeconds: 0,
		category: "rapid",
	},
	{
		id: "10+2",
		label: "10+2",
		subtitle: "rapid",
		limitSeconds: 600,
		incrementSeconds: 2,
		category: "rapid",
	},
	{
		id: "10+5",
		label: "10+5",
		subtitle: "rapid",
		limitSeconds: 600,
		incrementSeconds: 5,
		category: "rapid",
	},
	{
		id: "15+0",
		label: "15+0",
		subtitle: "rapid",
		limitSeconds: 900,
		incrementSeconds: 0,
		category: "rapid",
	},
	{
		id: "15+2",
		label: "15+2",
		subtitle: "rapid",
		limitSeconds: 900,
		incrementSeconds: 2,
		category: "rapid",
	},
	// Classical
	{
		id: "30+0",
		label: "30+0",
		subtitle: "classical",
		limitSeconds: 1800,
		incrementSeconds: 0,
		category: "classical",
	},
	{
		id: "30+2",
		label: "30+2",
		subtitle: "classical",
		limitSeconds: 1800,
		incrementSeconds: 2,
		category: "classical",
	},
	{
		id: "30+20",
		label: "30+20",
		subtitle: "classical",
		limitSeconds: 1800,
		incrementSeconds: 20,
		category: "classical",
	},
];

/**
 * Default preset ids per tab/mode.
 */
export const DEFAULT_PRESET_IDS: Record<"bot" | "unrated" | "rated", string[]> = {
	bot: ["3+2", "5+0", "10+0", "unlimited"],
	unrated: ["10+0", "10+2", "15+2", "30+0"],
	rated: ["15+0", "15+2", "30+0", "30+2"],
};

/**
 * Return the TimePreset list for a given mode based on the default ids.
 */
export function getDefaultTimePresetsForMode(mode: "bot" | "unrated" | "rated"): TimePreset[] {
	const ids = DEFAULT_PRESET_IDS[mode] ?? [];
	return ids.map((id) => findTimePreset(id)).filter((p): p is TimePreset => !!p);
}

/**
 * Player color selection for game setup.
 */
export type SetupColorChoice = ChallengeColor;

/**
 * Configuration for setting up a new game.
 */
export type GameSetup = {
	timePresetId: string;
	timeControl: {
		limit: number;
		increment: number;
	};
	colorChoice: ChallengeColor;
	rated: boolean;
};

/**
 * Bot difficulty level configuration.
 */
export type SetupBotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type SetupBotLevelInfo = {
	level: SetupBotLevel;
	label: string;
	description: string;
};

export const BOT_LEVELS: SetupBotLevelInfo[] = [
	{ level: 1, label: "Level 1", description: "Novice" },
	{ level: 2, label: "Level 2", description: "Beginner" },
	{ level: 3, label: "Level 3", description: "Casual" },
	{ level: 4, label: "Level 4", description: "Intermediate" },
	{ level: 5, label: "Level 5", description: "Tournament" },
	{ level: 6, label: "Level 6", description: "Advanced" },
	{ level: 7, label: "Level 7", description: "Expert" },
	{ level: 8, label: "Level 8", description: "Maximum" },
];

/**
 * Configuration for a bot game setup.
 */
export type BotGameSetup = {
	timePresetId: string;
	timeControl: {
		limit: number;
		increment: number;
	};
	colorChoice: SetupColorChoice;
	botLevel: SetupBotLevel;
};

export function createDefaultBotGameSetup(): BotGameSetup {
	return {
		timePresetId: "unlimited",
		timeControl: { limit: 0, increment: 0 },
		colorChoice: "random",
		botLevel: 1,
	};
}

export function createDefaultGameSetup(): GameSetup {
	return {
		timePresetId: "10+0",
		timeControl: { limit: 600, increment: 0 },
		colorChoice: "random",
		rated: false,
	};
}

export function findTimePreset(presetId: string): TimePreset | undefined {
	return TIME_PRESETS.find((p) => p.id === presetId);
}

export function findBotLevel(level: SetupBotLevel): SetupBotLevelInfo | undefined {
	return BOT_LEVELS.find((b) => b.level === level);
}
