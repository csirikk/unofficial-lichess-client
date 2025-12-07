export type TimeCategory = "unlimited" | "bullet" | "blitz" | "rapid" | "classical";

export type TimePreset = {
	id: string;
	label: string;
	subtitle: TimeCategory;
	limitSeconds: number;
	incrementSeconds: number;
	category: TimeCategory;
};

export const UI_TIME_PRESETS: TimePreset[] = [
	// Unlimited
	{
		id: "unlimited",
		label: "∞",
		subtitle: "unlimited",
		limitSeconds: 0,
		incrementSeconds: 0,
		category: "unlimited",
	},
	// // Bullet
	// {
	// 	id: "1+0",
	// 	label: "1+0",
	// 	subtitle: "bullet",
	// 	limitSeconds: 60,
	// 	incrementSeconds: 0,
	// 	category: "bullet",
	// },
	// {
	// 	id: "1+1",
	// 	label: "1+1",
	// 	subtitle: "bullet",
	// 	limitSeconds: 60,
	// 	incrementSeconds: 1,
	// 	category: "bullet",
	// },
	// {
	// 	id: "2+1",
	// 	label: "2+1",
	// 	subtitle: "bullet",
	// 	limitSeconds: 120,
	// 	incrementSeconds: 1,
	// 	category: "bullet",
	// },
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
		id: "10+5",
		label: "10+5",
		subtitle: "rapid",
		limitSeconds: 600,
		incrementSeconds: 5,
		category: "rapid",
	},
	{
		id: "15+10",
		label: "15+10",
		subtitle: "rapid",
		limitSeconds: 900,
		incrementSeconds: 10,
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
		id: "30+20",
		label: "30+20",
		subtitle: "classical",
		limitSeconds: 1800,
		incrementSeconds: 20,
		category: "classical",
	},
];

/**
 * Player color selection for game setup.
 */
export type SetupColorChoice = "white" | "black" | "random";

/**
 * Configuration for setting up a new game.
 */
export type GameSetup = {
	timePresetId: string;
	colorChoice: SetupColorChoice;
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

export const UI_BOT_LEVELS: SetupBotLevelInfo[] = [
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
	colorChoice: SetupColorChoice;
	botLevel: SetupBotLevel;
};

export function createDefaultBotGameSetup(): BotGameSetup {
	return {
		timePresetId: "unlimited",
		colorChoice: "random",
		botLevel: 1,
	};
}

export function createDefaultGameSetup(): GameSetup {
	return {
		timePresetId: "5+0",
		colorChoice: "random",
		rated: false,
	};
}

export function findTimePreset(presetId: string): TimePreset | undefined {
	return UI_TIME_PRESETS.find((p) => p.id === presetId);
}

export function findBotLevel(level: SetupBotLevel): SetupBotLevelInfo | undefined {
	return UI_BOT_LEVELS.find((b) => b.level === level);
}
