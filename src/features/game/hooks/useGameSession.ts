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
import { buildGameHistory, type MoveModel } from "../model/chess";
import { useBoardInteraction } from "./useBoardInteraction";
import { useCapturedPieces } from "./useCapturedPieces";
import { useEventStream } from "./useEventStream";
import { useGameClock } from "./useGameClock";
import { useGameEngine } from "./useGameEngine";
import { useGameStream } from "./useGameStream";
import { useHistoryKeyboard } from "./useHistoryKeyboard";
import { useHistoryMouse } from "./useHistoryMouse";
import { useHistoryViewing } from "./useHistoryViewing";
import { useSoundEffects } from "./useSoundEffects";
import { useBoardPreferences } from "./useBoardPreferences";
import { useBoardTheme } from "./useBoardTheme";

import { deriveGameState } from "../model/game-info-helpers";
import type { GameModel } from "../model/types";

export function useGameSession(gameId: string | null, setGameId: (id: string | null) => void) {
	const { user } = useAuth();
	const [isCreatingGame, setIsCreatingGame] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [rematchPending, setRematchPending] = useState(false);
	const [pendingChallengeId, setPendingChallengeId] = useState<string | null>(null);
	const [waitingForGame, setWaitingForGame] = useState(false);
	const [ratingDelta, setRatingDelta] = useState<{
		white: number | null;
		black: number | null;
	} | null>(null);

	const [pendingDrawOffer, setPendingDrawOffer] = useState(false);
	const [pendingTakebackOffer, setPendingTakebackOffer] = useState(false);
	const lastMoveCountRef = useRef<number>(0);

	const [modalDismissed, setModalDismissed] = useState(false);

	const seekAbortControllerRef = useRef<AbortController | null>(null);
	const seekStreamRef = useRef<{ close: () => void } | null>(null);
	const expectedSourceRef = useRef<"lobby" | "ai" | "friend" | null>(null);
	const ignoredGameIdsRef = useRef<Set<string>>(new Set());

	const preferences = useBoardPreferences();
	const themeViewModel = useBoardTheme(preferences.theme);

	const cancelSeek = useCallback(async () => {
		if (seekAbortControllerRef.current) {
			seekAbortControllerRef.current.abort();
			seekAbortControllerRef.current = null;
		}
		if (seekStreamRef.current) {
			void seekStreamRef.current.close();
			seekStreamRef.current = null;
		}
		setWaitingForGame(false);
		expectedSourceRef.current = null;
		ignoredGameIdsRef.current.clear();
	}, []);

	useEffect(() => {
		return () => {
			cancelSeek();
		};
	}, [cancelSeek]);

	const onGameStartHandler = useCallback(
		(event: GameStartEvent) => {
			if (!event.game) return;

			const eventGameId = event.game.gameId || event.game.id;
			const source = event.game.source || "unknown";

			if (!eventGameId) return;

			if (ignoredGameIdsRef.current.has(eventGameId)) {
				console.log("Ignoring pre-existing game:", eventGameId, "(source:", source, ")");
				return;
			}

			if (eventGameId === gameId) return;

			if (waitingForGame || rematchPending) {
				if (expectedSourceRef.current === "lobby" && source === "ai") {
					console.log("Ignoring background AI game while seeking lobby game:", eventGameId);
					return;
				}

				// When waiting for seek/rematch, accept the new game
				console.log(`Seek/rematch fulfilled by game ${eventGameId} (Source: ${source})`);
				setGameId(eventGameId);
				setRematchPending(false);
				setPendingChallengeId(null);
				setRatingDelta(null);

				// Stop the seek
				cancelSeek();
			} else if (!gameId) {
				setGameId(eventGameId);
				setWaitingForGame(false);
				setRematchPending(false);
				setRatingDelta(null);
			}
		},
		[waitingForGame, rematchPending, gameId, setGameId, cancelSeek],
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

	const onChallengeHandler = useCallback(
		(event: {
			challenge: {
				id: string;
				challenger?: { id?: string } | null;
				destUser?: { id?: string } | null;
			};
		}) => {
			if (event.challenge.challenger?.id === user?.id) {
				console.log("Our challenge sent:", event.challenge.id);
				setPendingChallengeId(event.challenge.id);
			}
		},
		[user?.id],
	);

	const onChallengeDeclinedHandler = useCallback(
		(event: { challenge?: { id?: string } }) => {
			if (event.challenge?.id === pendingChallengeId) {
				console.log("Challenge declined:", event.challenge.id);
				setPendingChallengeId(null);
				setRematchPending(false);
				setWaitingForGame(false);
			}
		},
		[pendingChallengeId],
	);

	const onChallengeCanceledHandler = useCallback(
		(event: { challenge?: { id?: string } }) => {
			if (event.challenge?.id === pendingChallengeId) {
				console.log("Challenge canceled:", event.challenge.id);
				setPendingChallengeId(null);
				setRematchPending(false);
				setWaitingForGame(false);
			}
		},
		[pendingChallengeId],
	);

	useEventStream({
		enabled: waitingForGame || gameId != null,
		onGameStart: onGameStartHandler,
		onGameFinish: onGameFinishHandler,
		onChallenge: onChallengeHandler,
		onChallengeDeclined: onChallengeDeclinedHandler,
		onChallengeCanceled: onChallengeCanceledHandler,
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

	const playPremoveSoundRef = useRef<((move: MoveModel) => void) | null>(null);

	const engineResult = useGameEngine({
		gameFull,
		serverFen,
		serverTurn,
		serverHistory,
		user,
		isConnected,
		makeMove,
		onPremoveSound: (move) => {
			playPremoveSoundRef.current?.(move);
		},
	});
	const { state: engineState, handlers: engineHandlers, gameInfo } = engineResult;
	const { myColor, isGameEnded } = gameInfo;

	useEffect(() => {
		if (isGameEnded) {
			setModalDismissed(false);
		}
	}, [isGameEnded]);

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

	useHistoryMouse({
		enabled: Boolean(gameId),
		goBack: history.goBack,
		goForward: history.goForward,
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
		gameId,
		moveHistory: serverHistory,
		isGameStarted: !!gameId && !!gameFull,
		isGameEnded,
		isViewingHistory: history.isViewingHistory,
		viewingMoveIndex: history.viewingMoveIndex,
		whiteTime: gameState?.wtime,
		blackTime: gameState?.btime,
	});

	useEffect(() => {
		playPremoveSoundRef.current = playMoveSound;
	}, [playMoveSound]);

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
		preferences,
		theme: themeViewModel,
	});

	const handleStartBotGame = async (config: {
		level: SetupBotLevel;
		clock: { limit: number; increment: number } | null;
		color: SetupColorChoice;
	}) => {
		cancelSeek();

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
	const handleStartOnlineGame = useCallback(
		async (setup: GameSetup) => {
			void cancelSeek();

			setError(null);
			setIsCreatingGame(true); // Button is disabled ("Creating seek...")
			setRatingDelta(null);

			ignoredGameIdsRef.current.clear();
			if (gameId) {
				ignoredGameIdsRef.current.add(gameId);
				console.log("Ignoring current game during seek:", gameId);
			}

			expectedSourceRef.current = "lobby";
			const controller = new AbortController();
			seekAbortControllerRef.current = controller;

			setWaitingForGame(true);

			try {
				const streamControl = await startOnlineSeek(setup, { signal: controller.signal });
				seekStreamRef.current = streamControl;
				setIsCreatingGame(false);
				await streamControl.closePromise;
				console.log("Seek stream closed.");
				setWaitingForGame(false);
			} catch (error: unknown) {
				if (error instanceof Error && error.name === "AbortError") {
					console.log("Seek cancelled by user");
					return;
				}
				console.error(error);
				setError(error instanceof Error ? error.message : "Failed to create online game");
				void cancelSeek();
				setIsCreatingGame(false);
			} finally {
				seekStreamRef.current = null;
				if (seekAbortControllerRef.current === controller) {
					seekAbortControllerRef.current = null;
				}
			}
		},
		[gameId, cancelSeek],
	);

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

		const controller = new AbortController();
		seekAbortControllerRef.current = controller;
		setRematchPending(true);
		setPendingChallengeId(null); // Reset before new challenge

		try {
			const result = await handleRematch(gameFull, myColor, { signal: controller.signal });
			setRatingDelta(null);

			if ("gameId" in result) {
				// AI game
				interactionHandlers.resetBoard();
				setGameId(result.gameId);
				setRematchPending(false);
			} else {
				// Human game
				seekStreamRef.current = result.streamControl;
				setWaitingForGame(true);
				expectedSourceRef.current = "friend";

				await result.streamControl.closePromise;

				console.log("Challenge stream closed");
				seekStreamRef.current = null;

				setPendingChallengeId(null);
				setRematchPending(false);
				setWaitingForGame(false);
			}
		} catch (error) {
			// user canceled
			if (error instanceof Error && error.name === "AbortError") {
				console.log("Rematch cancelled by user");
				return;
			}

			console.error("Rematch failed:", error);
			setPendingChallengeId(null);
			setRematchPending(false);
			setWaitingForGame(false);

			if (seekStreamRef.current) {
				void seekStreamRef.current.close();
				seekStreamRef.current = null;
			}
		} finally {
			if (seekAbortControllerRef.current === controller) {
				seekAbortControllerRef.current = null;
			}
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
				pendingChallengeId,
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
		pendingChallengeId,
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
			modalDismissed,
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
			cancelSeek,
			resign: handleResign,
			abort: handleAbort,
			offerDraw: handleOfferDraw,
			takeback: handleTakeback,
			rematch: handleRematchRequest,
			resetToLobby,
			showResultsModal: useCallback(() => setModalDismissed(false), []),
			dismissResultsModal: useCallback(() => setModalDismissed(true), []),
		},
	};
}
