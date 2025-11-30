import { useEffect, useMemo, useRef, useState } from "react";
import { GameStatusName } from "../../generated/types/gameStatusName";
import type { GameFullEvent, GameStateEvent } from "../../generated/types";

type ClockConfig = {
	gameFull: GameFullEvent | null;
	gameState: GameStateEvent | null;
	pendingMove: string | null;
};

type ClockColor = "w" | "b";

export function useGameClock({ gameFull, gameState, pendingMove }: ClockConfig) {
	const initialTime = useMemo(() => gameFull?.clock?.initial ?? null, [gameFull]);

	const [whiteBaseMs, setWhiteBaseMs] = useState<number | null>(initialTime);
	const [blackBaseMs, setBlackBaseMs] = useState<number | null>(initialTime);
	const [activeColor, setActiveColor] = useState<ClockColor | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [now, setNow] = useState(() => Date.now());

	const turnStartedAtRef = useRef<number | null>(null); // when current activeColor turn started
	const lastUiTurnRef = useRef<ClockColor | null>(null); // previous UI turn
	const hasStartedRef = useRef(false); // has any move been played
	const lastGameIdRef = useRef<string | null>(null); // to detect new game

	const lastServerWhiteMsRef = useRef<number | null>(null);
	const lastServerBlackMsRef = useRef<number | null>(null);

	// Main sync
	useEffect(() => {
		const latestState: GameStateEvent | null = gameState ?? gameFull?.state ?? null;
		const currentGameId: string | null = gameFull?.id ?? null;

		// New game - hard reset local model
		if (currentGameId && lastGameIdRef.current !== currentGameId) {
			lastGameIdRef.current = currentGameId;

			hasStartedRef.current = false;
			lastUiTurnRef.current = null;
			turnStartedAtRef.current = null;
			lastServerWhiteMsRef.current = null;
			lastServerBlackMsRef.current = null;

			setWhiteBaseMs(initialTime);
			setBlackBaseMs(initialTime);
			setActiveColor(null);
			setIsRunning(false);
			setNow(Date.now());
		}

		// Left the game - no id and no state
		if (!currentGameId && !latestState) {
			lastGameIdRef.current = null;
			hasStartedRef.current = false;
			turnStartedAtRef.current = null;
			setIsRunning(false);
			setActiveColor(null);
			return;
		}

		// No state yet - just show base times / "--:--"
		if (!latestState) {
			setWhiteBaseMs(initialTime);
			setBlackBaseMs(initialTime);
			setActiveColor(null);
			setIsRunning(false);
			turnStartedAtRef.current = null;
			return;
		}

		const { status, moves: movesStr, wtime, btime, winc = 0, binc = 0 } = latestState;

		if (wtime != null) lastServerWhiteMsRef.current = wtime;
		if (btime != null) lastServerBlackMsRef.current = btime;

		const moves = movesStr?.trim() ? movesStr.trim().split(/\s+/).filter(Boolean) : [];
		const moveCount = moves.length;
		const serverTurn: ClockColor = moveCount % 2 === 0 ? "w" : "b";

		const hasPendingNotAcked = !!pendingMove && !moves.includes(pendingMove);

		// UI turn (flip during pending move)
		const uiTurn: ClockColor = hasPendingNotAcked ? (serverTurn === "w" ? "b" : "w") : serverTurn;

		const prevUiTurn = lastUiTurnRef.current;
		const prevHadStarted = hasStartedRef.current;

		lastUiTurnRef.current = uiTurn;

		// Game starts only after both sides move
		if (moveCount > 1 && !hasStartedRef.current) {
			hasStartedRef.current = true;
		}

		// Game finished - freeze on last server snapshot and stop
		if (status !== GameStatusName.started) {
			if (lastServerWhiteMsRef.current != null) {
				setWhiteBaseMs(lastServerWhiteMsRef.current);
			}
			if (lastServerBlackMsRef.current != null) {
				setBlackBaseMs(lastServerBlackMsRef.current);
			}
			setIsRunning(false);
			setActiveColor(null);
			turnStartedAtRef.current = null;
			return;
		}

		// GRACE: until both sides have played, show base times not ticking
		if (!hasStartedRef.current) {
			if (initialTime != null) {
				setWhiteBaseMs(initialTime);
				setBlackBaseMs(initialTime);
			} else {
				// no explicit initial - fall back to server snapshot if present
				if (wtime != null) setWhiteBaseMs(wtime);
				if (btime != null) setBlackBaseMs(btime);
			}
			setIsRunning(false);
			setActiveColor(serverTurn);
			turnStartedAtRef.current = null;
			return;
		}

		const nowTs = Date.now();

		// GRACE to RUNNING (first move appeared or mid-game)
		if (!prevHadStarted && hasStartedRef.current) {
			// No previous turn to wrap, just enforce server time for current player
			if (uiTurn === "w") {
				if (wtime != null) setWhiteBaseMs(wtime);
			} else {
				if (btime != null) setBlackBaseMs(btime);
			}
			turnStartedAtRef.current = nowTs;
			setIsRunning(true);
			setActiveColor(uiTurn);
			setNow(nowTs);
			return;
		}

		// RUNNING: we only adjust baselines on turn change
		const wInc = winc;
		const bInc = binc;

		if (prevUiTurn && prevUiTurn !== uiTurn) {
			const turnStartedAt = turnStartedAtRef.current;
			const elapsed = turnStartedAt != null ? nowTs - turnStartedAt : 0;

			// 1. Finish previous turn: subtract elapsed + add increment
			if (elapsed > 0) {
				if (prevUiTurn === "w") {
					setWhiteBaseMs((prev) => {
						if (prev == null) return prev;
						const afterMove = Math.max(0, prev - elapsed) + wInc;
						return afterMove;
					});
				} else {
					setBlackBaseMs((prev) => {
						if (prev == null) return prev;
						const afterMove = Math.max(0, prev - elapsed) + bInc;
						return afterMove;
					});
				}
			}

			// 2. Start new turn: enforce their server time now
			if (uiTurn === "w") {
				if (wtime != null) setWhiteBaseMs(wtime);
			} else {
				if (btime != null) setBlackBaseMs(btime);
			}

			turnStartedAtRef.current = nowTs;
			setIsRunning(true);
			setActiveColor(uiTurn);
			setNow(nowTs);
			return;
		}

		setActiveColor(uiTurn);
		setIsRunning(true);
	}, [gameFull, gameState, pendingMove, initialTime]);

	// Local ticking
	useEffect(() => {
		if (!isRunning || !activeColor) return;

		const timer = setInterval(() => {
			setNow(Date.now());
		}, 100); // 10 FPS, smooth enough

		return () => clearInterval(timer);
	}, [isRunning, activeColor]);

	// Derive display times from baselines + elapsed
	const computeDisplayMs = (baseMs: number | null, color: ClockColor): number | null => {
		if (baseMs == null) return null;

		const turnStart = turnStartedAtRef.current;

		// If this color is not currently ticking, show frozen baseline
		if (!isRunning || !activeColor || activeColor !== color || !turnStart) {
			return baseMs;
		}

		const elapsed = now - turnStart;
		return Math.max(0, baseMs - elapsed);
	};

	const whiteMs = computeDisplayMs(whiteBaseMs, "w");
	const blackMs = computeDisplayMs(blackBaseMs, "b");

	return {
		whiteMs,
		blackMs,
		activeColor,
		isRunning,
	};
}
