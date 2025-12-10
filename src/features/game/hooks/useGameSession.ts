import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameColor } from "../../../generated/types/gameColor";
import type { GameFinishEvent } from "../../../generated/types/gameFinishEvent";
import type { GameStartEvent } from "../../../generated/types/gameStartEvent";
import type { GameEventInfo } from "../../../generated/types/gameEventInfo";
import type { GameJson } from "../../../generated/types/gameJson";
import { useAuth } from "../../auth/hooks/useAuth";
import {
	abortGame,
	handleRematch,
	offerDraw,
	requestTakeback,
	resignGame,
	startBotGame,
	startOnlineSeek,
} from "../model/game-actions";
import type { GameSetup, SetupBotLevel, SetupColorChoice } from "../model/setup";

import { useBoard } from "./useBoard";
import { useBoardInteraction } from "./useBoardInteraction";
import { useCapturedPieces } from "./useCapturedPieces";
import { useEventStream } from "./useEventStream";
import { useGameClock } from "./useGameClock";
import { useGameEngine } from "./useGameEngine";
import { useGameStream } from "./useGameStream";
import { useHistoryKeyboard } from "./useHistoryKeyboard";
import { useHistoryViewing } from "./useHistoryViewing";
import { useSoundEffects } from "./useSoundEffects";

export function useGameSession(gameId: string | null, setGameId: (id: string | null) => void) {
	const { user } = useAuth();
	const [isCreatingGame, setIsCreatingGame] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [rematchPending, setRematchPending] = useState(false);
	const [waitingForGame, setWaitingForGame] = useState(false);
	const [ratingDelta, setRatingDelta] = useState<{
		white: number | null;
		black: number | null;
	} | null>(null);
	const [gameEventInfo, setGameEventInfo] = useState<GameEventInfo | null>(null);
	const [gameJson, setGameJson] = useState<GameJson | null>(null);

	const [pendingDrawOffer, setPendingDrawOffer] = useState(false);
	const [pendingTakebackOffer, setPendingTakebackOffer] = useState(false);
	const lastMoveCountRef = useRef<number>(0);

	const onGameStartHandler = useCallback(
		(event: GameStartEvent) => {
			if (!event.game) return;

			const eventGameId = event.game.gameId || event.game.id;
			if (!eventGameId) return;

			if (eventGameId === gameId) return;

			if (waitingForGame || !gameId) {
				setGameId(eventGameId);
				setWaitingForGame(false);
				setRematchPending(false);
				setGameEventInfo(event.game);
				setGameJson(null);
				setRatingDelta(null);
			}
		},
		[waitingForGame, gameId, setGameId],
	);

	const onGameFinishHandler = useCallback(
		(
			event: GameFinishEvent,
			delta: { white: number | null; black: number | null },
			json?: GameJson | null,
		) => {
			const eventGameId = event.game?.gameId || event.game?.id;
			if (eventGameId === gameId) {
				setRatingDelta(delta);
				if (json) {
					setGameJson(json);
				}
			}
		},
		[gameId],
	);

	// Global event stream
	useEventStream({
		enabled: waitingForGame || gameId != null,
		onGameStart: onGameStartHandler,
		onGameFinish: onGameFinishHandler,
	});

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

	const { playMoveSound } = useSoundEffects({
		moveHistory: serverHistory,
		gameStarted: !!gameId && !!gameFull,
		gameEnded,
		isViewingHistory: history.isViewingHistory,
		viewingMoveIndex: history.viewingMoveIndex,
		whiteTime: gameState?.wtime,
		blackTime: gameState?.btime,
	});

	const interactionResult = useBoardInteraction({
		engineState,
		engineHandlers,
		gameInfo,
		playMoveSound,
	});
	const { state: interactionState, handlers: interactionHandlers } = interactionResult;

	const boardViewModel = useBoard({
		engineState,
		interactionState,
		interactionHandlers,
		gameInfo,
		isViewingHistory: history.isViewingHistory,
		displayPosition: history.displayPosition,
		viewedLastMove: history.viewedLastMove,
		takebackSquares: interactionState.takebackSquares,
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
			// Clear previous game state when starting a new game
			setGameEventInfo(null);
			setGameJson(null);
			setRatingDelta(null);
			setGameId(newGameId);
		} catch (error) {
			setError(error instanceof Error ? error.message : "Failed to create game");
		} finally {
			setIsCreatingGame(false);
		}
	};

	const handleStartOnlineGame = useCallback(async (setup: GameSetup) => {
		setError(null);
		setIsCreatingGame(true);
		setWaitingForGame(true);
		// Clear previous game state when starting a new game
		setGameEventInfo(null);
		setGameJson(null);
		setRatingDelta(null);
		try {
			await startOnlineSeek(setup);
			// Wait for /api/stream/event
		} catch (error) {
			console.error(error);
			setError(error instanceof Error ? error.message : "Failed to create online game");
			setWaitingForGame(false);
		} finally {
			setIsCreatingGame(false);
		}
	}, []);

	const handleResign = useCallback(async () => {
		if (!gameId || !isConnected) return;
		try {
			await resignGame(gameId);
		} catch (error) {
			console.error("Resign failed:", error);
		}
	}, [gameId, isConnected]);

	const handleAbort = useCallback(async () => {
		if (!gameId || !isConnected) return;
		try {
			await abortGame(gameId);
		} catch (error) {
			console.error("Abort failed:", error);
		}
	}, [gameId, isConnected]);

	const handleOfferDraw = useCallback(async () => {
		if (!gameId || !isConnected || gameEnded) return;
		const isAccepting = myColor === GameColor.white ? gameState?.bdraw : gameState?.wdraw;

		if (!isAccepting) {
			setPendingDrawOffer(true);
		}

		try {
			// API: true/"yes" = propose OR accept, false/"no" = decline
			// Since we call this to either propose or accept, always send true
			await offerDraw(gameId, true);
		} catch (error) {
			console.error("Draw action failed:", error);
			setPendingDrawOffer(false); // Clear on error
		}
	}, [gameId, isConnected, gameEnded, gameState, myColor]);

	const handleTakeback = useCallback(async () => {
		if (!gameId || !isConnected || gameEnded) return;
		const isAccepting = myColor === GameColor.white ? gameState?.btakeback : gameState?.wtakeback;

		if (!isAccepting) {
			setPendingTakebackOffer(true);
		}

		try {
			// API: true/"yes" = propose OR accept, false/"no" = decline
			// Since we call this to either propose or accept, always send true
			await requestTakeback(gameId, true);
		} catch (error) {
			console.error("Takeback action failed:", error);
			setPendingTakebackOffer(false);
		}
	}, [gameId, isConnected, gameEnded, gameState, myColor]);

	const handleRematchRequest = useCallback(async () => {
		if (!gameId || rematchPending || !gameFull || !myColor) return;
		setRematchPending(true);
		try {
			const result = await handleRematch(gameFull, myColor);

			// Clear previous game state
			setGameEventInfo(null);
			setGameJson(null);
			setRatingDelta(null);

			if ("gameId" in result) {
				// AI game
				interactionHandlers.resetBoard();
				setGameId(result.gameId);
				setRematchPending(false);
			} else {
				// Human game
				setWaitingForGame(true);
			}
		} catch (error) {
			console.error("Rematch failed:", error);
		}
	}, [gameId, rematchPending, gameFull, myColor, interactionHandlers, setGameId]);

	const resetToLobby = useCallback(() => {
		setGameId(null);
		interactionHandlers.resetBoard();
		setRematchPending(false);
	}, [interactionHandlers, setGameId]);

	const isBotGame = useMemo(() => {
		if (!gameFull) return false;
		return Boolean(gameFull.white.aiLevel || gameFull.black.aiLevel);
	}, [gameFull]);

	const timerOrder = useMemo(() => {
		return (myColor === GameColor.white ? ["black", "white"] : ["white", "black"]) as Array<
			"white" | "black"
		>;
	}, [myColor]);

	useEffect(() => {
		if (!gameState) return;

		const currentMoveCount = gameState.moves.split(" ").filter((m) => m).length;

		if (currentMoveCount !== lastMoveCountRef.current) {
			setPendingDrawOffer(false);
			setPendingTakebackOffer(false);
			lastMoveCountRef.current = currentMoveCount;
		}

		const serverHasMyDraw = myColor === GameColor.white ? gameState.wdraw : gameState.bdraw;
		const serverHasMyTakeback =
			myColor === GameColor.white ? gameState.wtakeback : gameState.btakeback;

		if (serverHasMyDraw) setPendingDrawOffer(false);
		if (serverHasMyTakeback) setPendingTakebackOffer(false);
	}, [gameState, myColor]);

	const drawOfferedByMe = useMemo(() => {
		if (!gameState) return false;
		return (myColor === GameColor.white ? gameState.wdraw : gameState.bdraw) || pendingDrawOffer;
	}, [gameState, myColor, pendingDrawOffer]);

	const drawOfferedByOpponent = useMemo(() => {
		if (!gameState) return false;
		return myColor === GameColor.white ? gameState.bdraw : gameState.wdraw;
	}, [gameState, myColor]);

	const takebackOfferedByMe = useMemo(() => {
		if (!gameState) return false;
		return (
			(myColor === GameColor.white ? gameState.wtakeback : gameState.btakeback) ||
			pendingTakebackOffer
		);
	}, [gameState, myColor, pendingTakebackOffer]);

	const takebackOfferedByOpponent = useMemo(() => {
		if (!gameState) return false;
		return myColor === GameColor.white ? gameState.btakeback : gameState.wtakeback;
	}, [gameState, myColor]);

	const playerOpponentRatingDelta = useMemo(() => {
		if (!ratingDelta || !myColor) return null;
		const myDelta = myColor === GameColor.white ? ratingDelta.white : ratingDelta.black;
		const oppDelta = myColor === GameColor.white ? ratingDelta.black : ratingDelta.white;
		return { player: myDelta, opponent: oppDelta };
	}, [ratingDelta, myColor]);

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
			waitingForGame,
			error: error || stream.error,
			isConnected,
			isConnecting,
			isReconnecting,
			isOffline,
			streamNotFound,
			drawOfferedByMe,
			drawOfferedByOpponent,
			takebackOfferedByMe,
			takebackOfferedByOpponent,
			rematchPending,
			isBotGame,
			ratingDelta: playerOpponentRatingDelta,
			gameEventInfo,
			gameJson,
		},

		actions: {
			startBotGame: handleStartBotGame,
			startOnlineGame: handleStartOnlineGame,
			resign: handleResign,
			abort: handleAbort,
			offerDraw: handleOfferDraw,
			takeback: handleTakeback,
			rematch: handleRematchRequest,
			resetToLobby,
		},
	};
}
