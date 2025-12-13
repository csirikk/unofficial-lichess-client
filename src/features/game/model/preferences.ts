/**
 * preferences.ts
 *
 * Model for board preferences: storage helpers and getters/setters.
 */

export type BoardTheme = "default" | "classic";

export type BoardPreferences = {
	premoveEnabled: boolean;
	showCoordinates: boolean;
	autoQueenPromotion: boolean;
	boardTheme: BoardTheme;
};

const STORAGE_KEY_PREFIX = "chess-board:";

const PREMOVE_KEY = `${STORAGE_KEY_PREFIX}premove-enabled`;
const COORDINATES_KEY = `${STORAGE_KEY_PREFIX}show-coordinates`;
const AUTO_QUEEN_KEY = `${STORAGE_KEY_PREFIX}auto-queen`;
const THEME_KEY = `${STORAGE_KEY_PREFIX}theme`;

function loadBooleanPref(key: string, defaultValue: boolean): boolean {
	if (typeof localStorage === "undefined") return defaultValue;
	try {
		const stored = localStorage.getItem(key);
		return stored === null ? defaultValue : stored === "true";
	} catch {
		return defaultValue;
	}
}

function saveBooleanPref(key: string, value: boolean): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(key, String(value));
	} catch (error) {
		console.error(`Failed to save preference ${key}:`, error);
	}
}

function loadTheme(): BoardTheme {
	if (typeof localStorage === "undefined") return "default";
	try {
		const stored = localStorage.getItem(THEME_KEY);
		return stored === "classic" ? "classic" : "default";
	} catch {
		return "default";
	}
}

function saveTheme(theme: BoardTheme): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(THEME_KEY, theme);
	} catch (error) {
		console.error("Failed to save theme preference:", error);
	}
}

export function getBoardPreferences(): BoardPreferences {
	return {
		premoveEnabled: loadBooleanPref(PREMOVE_KEY, true),
		showCoordinates: loadBooleanPref(COORDINATES_KEY, false),
		autoQueenPromotion: loadBooleanPref(AUTO_QUEEN_KEY, false),
		boardTheme: loadTheme(),
	};
}

export function isPremoveEnabled(): boolean {
	return loadBooleanPref(PREMOVE_KEY, true);
}

export function setPremoveEnabled(enabled: boolean): void {
	saveBooleanPref(PREMOVE_KEY, enabled);
}

export function isCoordinatesEnabled(): boolean {
	return loadBooleanPref(COORDINATES_KEY, false);
}

export function setCoordinatesEnabled(enabled: boolean): void {
	saveBooleanPref(COORDINATES_KEY, enabled);
}

export function isAutoQueenEnabled(): boolean {
	return loadBooleanPref(AUTO_QUEEN_KEY, false);
}

export function setAutoQueenEnabled(enabled: boolean): void {
	saveBooleanPref(AUTO_QUEEN_KEY, enabled);
}

export function getBoardTheme(): BoardTheme {
	return loadTheme();
}

export function setBoardTheme(theme: BoardTheme): void {
	saveTheme(theme);
}

export function toggleBoardTheme(): BoardTheme {
	const current = getBoardTheme();
	const next: BoardTheme = current === "default" ? "classic" : "default";
	setBoardTheme(next);
	return next;
}
