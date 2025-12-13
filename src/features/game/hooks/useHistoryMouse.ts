/**
 * useHistoryMouse.ts
 *
 * Hook adding mouse controls for history navigation.
 */

import { useEffect, useRef } from "react";

export type HistoryMouseConfig = {
	enabled: boolean;
	goBack: () => void;
	goForward: () => void;
	goToLive: () => void;
};

export function useHistoryMouse({
	enabled,
	goBack,
	goForward,
	goToLive,
}: HistoryMouseConfig): void {
	const lastWheelAtRef = useRef(0);
	const LIMIT_MS = 10;

	useEffect(() => {
		if (!enabled) return;

		const eventIsInTarget = (ev: Event) => {
			const maybe = ev as unknown as { composedPath?: () => EventTarget[] };
			const path = typeof maybe.composedPath === "function" ? maybe.composedPath() : null;
			if (path && Array.isArray(path)) {
				for (const node of path) {
					if (
						node &&
						typeof node === "object" &&
						(node as Element).hasAttribute &&
						(node as Element).hasAttribute("data-history-target")
					) {
						return true;
					}
				}
			}

			let node = ev.target as Node | null;
			while (node) {
				if (node instanceof Element && node.hasAttribute("data-history-target")) return true;
				node = node.parentElement;
			}

			return false;
		};

		const onWheel = (ev: WheelEvent) => {
			if (!eventIsInTarget(ev)) return;
			const now = Date.now();
			if (now - lastWheelAtRef.current < LIMIT_MS) {
				ev.preventDefault();
				ev.stopPropagation();
				return;
			}

			// vertical scroll: negative = up, positive = down
			if (Math.abs(ev.deltaY) < 10) return; // ignore small scrolls

			lastWheelAtRef.current = now;

			if (ev.deltaY < 0) {
				ev.preventDefault();
				ev.stopPropagation();
				goBack();
			} else if (ev.deltaY > 0) {
				ev.preventDefault();
				ev.stopPropagation();
				goForward();
			}
		};

		const onMouseDown = (ev: MouseEvent) => {
			if (ev.button !== 1) return;
			if (!eventIsInTarget(ev)) return;
			ev.preventDefault();
			ev.stopPropagation();
			goToLive();
		};

		window.addEventListener("wheel", onWheel, { passive: false });
		window.addEventListener("mousedown", onMouseDown);

		return () => {
			window.removeEventListener("wheel", onWheel);
			window.removeEventListener("mousedown", onMouseDown);
		};
	}, [enabled, goBack, goForward, goToLive]);
}
