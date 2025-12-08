import { useCallback, useMemo, useState } from "react";
import { GameColor } from "../../../generated/types/gameColor";
import { useAuth } from "../../auth/hooks/useAuth";
import { abortGame, offerDraw, resignGame, startBotGame } from "../model/game-actions";
import type { SetupBotLevel, SetupColorChoice } from "../model/setup";

import { useBoard } from "./useBoard";
import { useBoardInteraction } from "./useBoardInteraction";
import { useCapturedPieces } from "./useCapturedPieces";
import { useGameClock } from "./useGameClock";
import { useGameEngine } from "./useGameEngine";
import { useGameStream } from "./useGameStream";
import { useHistoryKeyboard } from "./useHistoryKeyboard";
import { useHistoryViewing } from "./useHistoryViewing";

export function useGameSession(gameId: string | null, setGameId: (id: string | null) => void) {
	const { user } = useAuth();
	const [isCreatingGame, setIsCreatingGame] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const stream = useGameStream(gameId);
	const {
		gameFull,
		gameState,
		serverFen,
		serverTurn,
		serverHistory,
		isConnected,
		isConnecting,
		isReconnecting,
		isOffline,
		streamNotFound,
		makeMove,
	} = stream;

	const engineResult = useGameEngine({
		gameFull,
		serverFen,
		serverTurn,
		serverHistory,
		user,
		isConnected,
		makeMove,
	});
	const { state: engineState, handlers: engineHandlers, gameInfo } = engineResult;
	const { myColor, gameEnded, status, winner } = gameInfo;

	const interactionResult = useBoardInteraction({
		engineState,
		engineHandlers,
		gameInfo,
	});
	const { state: interactionState, handlers: interactionHandlers } = interactionResult;

	const clockState = useGameClock({
		gameFull,
		gameState,
		pendingMove: engineState.pendingUci,
		serverTurn,
		serverHistory,
	});

	const boardChess = engineState.chess;
	const history = useHistoryViewing({
		chess: boardChess,
		serverHistory,
	});

	useHistoryKeyboard({
		enabled: Boolean(gameId),
		goBack: history.goBack,
		goForward: history.goForward,
		goToStart: history.goToStart,
		goToLive: history.goToLive,
	});

	const capturedState = useCapturedPieces({
		serverHistory,
		serverFen,
		pendingUci: engineState.pendingUci,
		viewingMoveIndex: history.viewingMoveIndex,
		chess: boardChess,
		isViewingHistory: history.isViewingHistory,
	});

	const boardViewModel = useBoard({
		engineState,
		interactionState,
		interactionHandlers,
		gameInfo,
		isViewingHistory: history.isViewingHistory,
		displayPosition: history.displayPosition,
		viewedLastMove: history.viewedLastMove,
		onInteract: history.goToLive,
	});

	const handleStartBotGame = async (config: {
		level: SetupBotLevel;
		clock: { limit: number; increment: number } | null;
		color: SetupColorChoice;
	}) => {
		setIsCreatingGame(true);
		setError(null);
		try {
			const { gameId: newGameId } = await startBotGame(config.level, config.clock, config.color);
			interactionHandlers.resetBoard();
			setGameId(newGameId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create game");
		} finally {
			setIsCreatingGame(false);
		}
	};

	const handleResign = useCallback(async () => {
		if (!gameId || !isConnected) return;
		try {
			await resignGame(gameId);
		} catch (e) {
			console.error("Resign failed:", e);
		}
	}, [gameId, isConnected]);

	const handleAbort = useCallback(async () => {
		if (!gameId || !isConnected) return;
		try {
			await abortGame(gameId);
		} catch (e) {
			console.error("Abort failed:", e);
		}
	}, [gameId, isConnected]);

	const handleOfferDraw = useCallback(async () => {
		if (!gameId || !isConnected || gameEnded) return;
		try {
			await offerDraw(gameId);
		} catch (e) {
			console.error("Draw offer failed:", e);
		}
	}, [gameId, isConnected, gameEnded]);

	const resetToLobby = useCallback(() => {
		setGameId(null);
		interactionHandlers.resetBoard();
	}, [interactionHandlers, setGameId]);

	// Timer order helpers
	const timerOrder = useMemo(() => {
		return (myColor === GameColor.white ? ["black", "white"] : ["white", "black"]) as Array<
			"white" | "black"
		>;
	}, [myColor]);

	return {
		boardViewModel,
		clockState,
		historyState: {
			...history,
			moveHistory: engineState.moveHistory,
		},
		capturedState,

		gameState: {
			gameId,
			gameFull,
			status,
			winner,
			gameEnded,
			myColor,
			timerOrder,
			isCreatingGame,
			error: error || stream.error,
			isConnected,
			isConnecting,
			isReconnecting,
			isOffline,
			streamNotFound,
		},

		actions: {
			startBotGame: handleStartBotGame,
			resign: handleResign,
			abort: handleAbort,
			offerDraw: handleOfferDraw,
			resetToLobby,
		},
	};
}
