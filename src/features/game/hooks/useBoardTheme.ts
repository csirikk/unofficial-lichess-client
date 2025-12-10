/**
 * useBoardTheme Hook
 *
 * Provides theme-specific board colors based on the current theme.
 */
import { useMemo } from "react";
import type { BoardTheme } from "../model/preferences";

export type BoardColors = {
	lightSquare: string;
	darkSquare: string;
	premoveHighlight: string;
	lastMoveHighlight: string;
	checkHighlight: string;
	selectedHighlight: string;
	legalDotLight: string;
	legalDotDark: string;
	captureHighlight: string;
	coordinateLight: string;
	coordinateDark: string;
};

export type BoardThemeViewModel = {
	colors: BoardColors;
	useCustomArrows: boolean;
};

export function useBoardTheme(theme: BoardTheme): BoardThemeViewModel {
	const colors = useMemo<BoardColors>(() => {
		if (theme === "classic") {
			return {
				lightSquare: "rgb(var(--color-chess-classic-light-square))",
				darkSquare: "rgb(var(--color-chess-classic-dark-square))",
				premoveHighlight: "rgb(var(--color-chess-classic-premove) / 0.4)",
				lastMoveHighlight: "rgb(var(--color-chess-classic-last-move) / 0.4)",
				checkHighlight: "rgb(var(--color-chess-classic-check) / 0.9)",
				selectedHighlight: "rgb(var(--color-chess-classic-selected) / 0.5)",
				legalDotLight: "rgb(var(--color-chess-classic-legal-dot-light) / 0.5)",
				legalDotDark: "rgb(var(--color-chess-classic-legal-dot-dark) / 0.75)",
				captureHighlight: "rgb(var(--color-chess-classic-capture) / 0.75)",
				coordinateLight: "rgb(var(--color-chess-classic-dark-square))",
				coordinateDark: "rgb(var(--color-chess-classic-light-square))",
			};
		}
		return {
			lightSquare: "rgb(var(--color-chess-light-square))",
			darkSquare: "rgb(var(--color-chess-dark-square))",
			premoveHighlight: "rgb(var(--color-chess-move-premove) / 0.9)",
			lastMoveHighlight: "rgb(var(--color-chess-move-last) / 0.4)",
			checkHighlight: "rgb(var(--color-chess-in-check) / 0.9)",
			selectedHighlight: "rgb(var(--color-primary-400) / 0.2)",
			legalDotLight: "rgb(var(--color-primary-900) / 0.8)",
			legalDotDark: "rgb(var(--color-chess-move-legal-dot) / 0.5)",
			captureHighlight: "rgb(var(--color-chess-move-draw) / 0.8)",
			coordinateLight: "rgb(var(--color-chess-light-square))",
			coordinateDark: "rgb(var(--color-chess-dark-square))",
		};
	}, [theme]);

	const useCustomArrows = theme !== "classic";

	return {
		colors,
		useCustomArrows,
	};
}
