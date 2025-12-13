/**
 * useBoardPreferences.ts
 *
 * Hook exposing board preferences and change notifications.
 */

import { useEffect, useState } from "react";
import { getBoardTheme, isCoordinatesEnabled, type BoardTheme } from "../model/preferences";

export type BoardPreferencesViewModel = {
	theme: BoardTheme;
	showCoordinates: boolean;
	preferencesVersion: number; // Used to force re-renders when preferences change
};

export function useBoardPreferences(): BoardPreferencesViewModel {
	const [theme, setTheme] = useState<BoardTheme>(() => getBoardTheme());
	const [showCoordinates, setShowCoordinates] = useState(() => isCoordinatesEnabled());
	const [preferencesVersion, setPreferencesVersion] = useState(0);

	useEffect(() => {
		const handlePreferenceChange = () => {
			setTheme(getBoardTheme());
			setShowCoordinates(isCoordinatesEnabled());
			setPreferencesVersion((prev) => prev + 1);
		};

		window.addEventListener("storage", handlePreferenceChange);
		window.addEventListener("board-preferences-changed", handlePreferenceChange);

		return () => {
			window.removeEventListener("storage", handlePreferenceChange);
			window.removeEventListener("board-preferences-changed", handlePreferenceChange);
		};
	}, []);

	return {
		theme,
		showCoordinates,
		preferencesVersion,
	};
}
