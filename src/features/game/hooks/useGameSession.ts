import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameColor as Color } from "../../../generated/types/gameColor";
import { gameColorToChessColor } from "../model/chess";
import type { GameFinishEvent } from "../../../generated/types/gameFinishEvent";
import type { GameStartEvent } from "../../../generated/types/gameStartEvent";
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
import { buildGameHistory } from "../model/chess";
import { useBoardInteraction } from "./useBoardInteraction";
import { useCapturedPieces } from "./useCapturedPieces";
import { useEventStream } from "./useEventStream";
import { useGameClock } from "./useGameClock";
import { useGameEngine } from "./useGameEngine";
import { useGameStream } from "./useGameStream";
import { useHistoryKeyboard } from "./useHistoryKeyboard";
import { useHistoryViewing } from "./useHistoryViewing";
import { useSoundEffects } from "./useSoundEffects";
import { deriveGameState } from "../model/game-info-helpers";
import type { GameModel } from "../model/types";

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
				setRatingDelta(null);
			}
		},
		[waitingForGame, gameId, setGameId],
	);

	const onGameFinishHandler = useCallback(
		(event: GameFinishEvent, delta: { white: number | null; black: number | null }) => {
			const eventGameId = event.game?.gameId || event.game?.id;
			if (eventGameId === gameId) {
				setRatingDelta(delta);
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
	const { myColor, isGameEnded } = gameInfo;

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
		isGameStarted: !!gameId && !!gameFull,
		isGameEnded,
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
		if (!gameId || !isConnected || isGameEnded) return;
		const isAccepting = myColor === Color.white ? gameState?.bdraw : gameState?.wdraw;

		if (!isAccepting) {
			setPendingDrawOffer(true);
		}

		try {
			// API: /api/game/{gameId}/draw
			await offerDraw(gameId, true);
		} catch (error) {
			console.error("Draw action failed:", error);
			setPendingDrawOffer(false); // Clear on error
		}
	}, [gameId, isConnected, isGameEnded, gameState, myColor]);

	const handleTakeback = useCallback(async () => {
		if (!gameId || !isConnected || isGameEnded) return;
		const isAccepting = myColor === Color.white ? gameState?.btakeback : gameState?.wtakeback;

		if (!isAccepting) {
			setPendingTakebackOffer(true);
		}

		try {
			// API:
			await requestTakeback(gameId, true);
		} catch (error) {
			console.error("Takeback action failed:", error);
			setPendingTakebackOffer(false);
		}
	}, [gameId, isConnected, isGameEnded, gameState, myColor]);

	const handleRematchRequest = useCallback(async () => {
		if (!gameId || rematchPending || !gameFull || !myColor) return;
		setRematchPending(true);
		try {
			const result = await handleRematch(gameFull, myColor);
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

	const timerOrder = useMemo(() => {
		return myColor === Color.white ? [Color.black, Color.white] : [Color.white, Color.black];
	}, [myColor]);

	useEffect(() => {
		if (!gameState) return;

		const { history } = buildGameHistory(gameState.moves, gameFull?.initialFen ?? "start");
		const currentMoveCount = history.length;

		if (currentMoveCount !== lastMoveCountRef.current) {
			setPendingDrawOffer(false);
			setPendingTakebackOffer(false);
			lastMoveCountRef.current = currentMoveCount;
		}

		const serverHasMyDraw = myColor === Color.white ? gameState.wdraw : gameState.bdraw;
		const serverHasMyTakeback = myColor === Color.white ? gameState.wtakeback : gameState.btakeback;

		if (serverHasMyDraw) setPendingDrawOffer(false);
		if (serverHasMyTakeback) setPendingTakebackOffer(false);
	}, [gameState, myColor, gameFull]);

	const drawOfferedByMe = useMemo(() => {
		if (!gameState) return false;
		return (myColor === Color.white ? gameState.wdraw : gameState.bdraw) || pendingDrawOffer;
	}, [gameState, myColor, pendingDrawOffer]);

	const drawOfferedByOpponent = useMemo(() => {
		if (!gameState) return false;
		return myColor === Color.white ? gameState.bdraw : gameState.wdraw;
	}, [gameState, myColor]);

	const takebackOfferedByMe = useMemo(() => {
		if (!gameState) return false;
		return (
			(myColor === Color.white ? gameState.wtakeback : gameState.btakeback) || pendingTakebackOffer
		);
	}, [gameState, myColor, pendingTakebackOffer]);

	const takebackOfferedByOpponent = useMemo(() => {
		if (!gameState) return false;
		return myColor === Color.white ? gameState.btakeback : gameState.wtakeback;
	}, [gameState, myColor]);

	const gameModel = useMemo<GameModel | null>(() => {
		return deriveGameState(
			gameFull,
			gameState,
			myColor,
			{
				whiteMs: clockState.whiteMs,
				blackMs: clockState.blackMs,
				activeColor: clockState.activeColor ? gameColorToChessColor(clockState.activeColor) : null,
			},
			ratingDelta
				? {
						white: myColor === Color.white ? ratingDelta.white : ratingDelta.black,
						black: myColor === Color.black ? ratingDelta.white : ratingDelta.black,
					}
				: null,
			{
				drawOfferedByWhite: myColor === Color.white ? drawOfferedByMe : drawOfferedByOpponent,
				drawOfferedByBlack: myColor === Color.black ? drawOfferedByMe : drawOfferedByOpponent,
				takebackOfferedByWhite:
					myColor === Color.white ? takebackOfferedByMe : takebackOfferedByOpponent,
				takebackOfferedByBlack:
					myColor === Color.black ? takebackOfferedByMe : takebackOfferedByOpponent,
				rematchPending,
			},
			null,
			true,
		);
	}, [
		gameFull,
		gameState,
		myColor,
		clockState.whiteMs,
		clockState.blackMs,
		clockState.activeColor,
		ratingDelta,
		drawOfferedByMe,
		drawOfferedByOpponent,
		takebackOfferedByMe,
		takebackOfferedByOpponent,
		rematchPending,
	]);

	return {
		gameModel,

		boardViewModel,
		historyState: {
			...history,
			moveHistory: engineState.moveHistory,
			totalMoves: serverHistory.length,
		},
		capturedState,

		sessionState: {
			gameId,
			isGameEnded,
			timerOrder,
			isCreatingGame,
			waitingForGame,
			error: error || stream.error,
			isConnected,
			isConnecting,
			isReconnecting,
			isOffline,
			isStreamNotFound: streamNotFound,
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
