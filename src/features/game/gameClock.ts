import { useState, useEffect, useRef, useMemo } from "react";
import { GameStatusName } from "../../generated/types/gameStatusName";
import type { GameStateEvent, GameFullEvent } from "../../generated/types";

type ClockConfig = {
	gameFull: GameFullEvent | null;
	gameState: GameStateEvent | null;
	pendingMove: string | null;
};

const getInitialTime = (gameFull: GameFullEvent | null): number | null => {
	return gameFull?.clock?.initial ?? null;
};

export function useGameClock({ gameFull, gameState, pendingMove }: ClockConfig) {
	const initialTime = useMemo(() => getInitialTime(gameFull), [gameFull]);

	const [whiteMs, setWhiteMs] = useState<number | null>(initialTime);
	const [blackMs, setBlackMs] = useState<number | null>(initialTime);
	const [activeColor, setActiveColor] = useState<"w" | "b" | null>(null);
	const [isRunning, setIsRunning] = useState(false);

	const lastTickTimeRef = useRef<number | null>(null);
	const syncedMoveCountRef = useRef(0);

	useEffect(() => {
		const latestState = gameState ?? gameFull?.state;
		if (!latestState) {
			if (initialTime !== null) {
				setWhiteMs(initialTime);
				setBlackMs(initialTime);
			} else {
				setWhiteMs(null);
				setBlackMs(null);
				setActiveColor(null);
				setIsRunning(false);
			}
			return;
		}

		const moves = latestState.moves?.trim().split(/\s+/).filter(Boolean) ?? [];
		const baseTurn = moves.length % 2 === 0 ? "w" : "b";

		const turn =
			pendingMove && !moves.includes(pendingMove) ? (baseTurn === "w" ? "b" : "w") : baseTurn;
		setActiveColor(turn);

		const gameIsRunning =
			latestState.status === GameStatusName.started && (moves.length > 0 || !!pendingMove);
		setIsRunning(gameIsRunning);

		// Sync with server time
		if (latestState.wtime != null && latestState.btime != null) {
			if (!pendingMove || moves.length > syncedMoveCountRef.current) {
				setWhiteMs(latestState.wtime);
				setBlackMs(latestState.btime);
				syncedMoveCountRef.current = moves.length;
			}
		}

		// Stop clock if game ends
		if (latestState.status !== GameStatusName.started) {
			lastTickTimeRef.current = null;
		}
	}, [gameFull, gameState, pendingMove, initialTime]);

	useEffect(() => {
		if (!isRunning || !activeColor) {
			lastTickTimeRef.current = null;
			return;
		}

		const timer = setInterval(() => {
			const now = Date.now();
			const lastTickTime = lastTickTimeRef.current;

			if (lastTickTime) {
				const elapsed = now - lastTickTime;
				if (activeColor === "w") {
					setWhiteMs((prev) => Math.max(0, (prev ?? 0) - elapsed));
				} else {
					setBlackMs((prev) => Math.max(0, (prev ?? 0) - elapsed));
				}
			}
			lastTickTimeRef.current = now;
		}, 100);

		return () => clearInterval(timer);
	}, [isRunning, activeColor]);

	return {
		whiteMs,
		blackMs,
		activeColor,
		isRunning,
	};
}
