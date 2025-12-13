/**
 * useHistoryKeyboard.ts
 *
 * Hook adding keyboard navigation for history viewing.
 */

import { useEffect } from "react";

export type HistoryKeyboardConfig = {
	enabled: boolean;
	goBack: () => void;
	goForward: () => void;
	goToStart: () => void;
	goToLive: () => void;
};

export function useHistoryKeyboard({
	enabled,
	goBack,
	goForward,
	goToStart,
	goToLive,
}: HistoryKeyboardConfig): void {
	useEffect(() => {
		if (!enabled) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			const key = event.key.toLowerCase();
			switch (key) {
				case "arrowleft":
				case "a":
					event.preventDefault();
					goBack();
					break;
				case "arrowright":
				case "d":
					event.preventDefault();
					goForward();
					break;
				case "arrowup":
				case "w":
					event.preventDefault();
					goToStart();
					break;
				case "arrowdown":
				case "s":
					event.preventDefault();
					goToLive();
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [enabled, goBack, goForward, goToStart, goToLive]);
}
