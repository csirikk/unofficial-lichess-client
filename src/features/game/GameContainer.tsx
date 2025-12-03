/**
 * GameContainer
 *
 * Main entry point for the game feature.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { GameColor } from "../../generated/types/gameColor";
import { useAuth } from "../auth/hooks/useAuth";
import { getGameIdFromURL, setGameIdInURL } from "../../lib/url";
import type { SetupBotLevel, SetupColorChoice } from "./logic/setup";

import { useGameStream } from "./hooks/useGameStream";
import { useGameClock } from "./hooks/useGameClock";
import { useMoveLogic } from "./hooks/useMoveLogic";

import { Board } from "./components/Board";
import { ClockPanel } from "./components/Clock";
import { Controls } from "./components/Controls";
import { MoveList } from "./components/MoveList";
import { GameModeTabs } from "./GameModeTabs";

import { abortGame, offerDraw, resignGame, startBotGame } from "./gameActions";

export default function GameContainer() {
	const { user } = useAuth();

	const [gameId, setGameId] = useState<string | null>(() => getGameIdFromURL());
	const [isCreatingGame, setIsCreatingGame] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Stream state
	const {
		gameFull,
		gameState,
		isConnected,
		isConnecting,
		isReconnecting,
		isOffline,
		streamNotFound,
		error: streamError,
		makeMove,
	} = useGameStream(gameId);

	// Move logic
	const { boardState, handlers, gameInfo, pendingUci } = useMoveLogic({
		gameId,
		gameFull,
		gameState,
		user,
		isConnected,
		makeMove,
	});

	// Clock state
	const { whiteMs, blackMs, activeColor } = useGameClock({
		gameFull,
		gameState,
		pendingMove: pendingUci,
	});

	const { myColor, boardOrientation, gameEnded, status, winner } = gameInfo;

	// Timer order based on board orientation
	const timerOrder = useMemo(() => {
		return (myColor === GameColor.white ? ["black", "white"] : ["white", "black"]) as Array<
			"white" | "black"
		>;
	}, [myColor]);

	// Show gameID change in url
	useEffect(() => {
		setGameIdInURL(gameId);
	}, [gameId]);

	// Remove gameID from url when game ends
	useEffect(() => {
		if (gameEnded) setGameIdInURL(null);
	}, [gameEnded]);

	// Game action handlers
	const handleStartBotGame = async (config: {
		level: SetupBotLevel;
		clock: { limit: number; increment: number } | null;
		color: SetupColorChoice;
	}) => {
		setIsCreatingGame(true);
		setError(null);
		try {
			const { gameId: newGameId } = await startBotGame(config.level, config.clock, config.color);
			handlers.resetBoard();
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
			setGameIdInURL(null);
		} catch (e) {
			console.error("Resign failed:", e);
		}
	}, [gameId, isConnected]);

	const handleAbort = useCallback(async () => {
		if (!gameId || !isConnected) return;
		try {
			await abortGame(gameId);
			setGameIdInURL(null);
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
		handlers.resetBoard();
	}, [handlers]);

	const moveCount = boardState.moveHistory.length;

	return (
		<div className="grid items-start gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2.2fr)]">
			{/* Left col: moves column + board */}
			<div className={`md:col-span-1 transition-opacity ${!gameId ? "opacity-80" : ""}`}>
				<div className="flex h-full items-stretch gap-4">
					{/* Moves column */}
					<MoveList moves={boardState.moveHistory} visible={!!gameId} />

					{/* Board */}
					<div className="flex-1">
						<Board
							position={boardState.position}
							boardOrientation={boardOrientation}
							ghostPieces={boardState.ghostPieces}
							selectedSquare={boardState.selectedSquare}
							lastMoveSquares={boardState.lastMoveSquares}
							checkSquare={boardState.checkSquare}
							legalMoves={boardState.legalMoves}
							premoveQueue={boardState.premoveQueue}
							promotionRequest={boardState.promotionRequest}
							showAnimations={boardState.showAnimations}
							onSquareClick={handlers.handleBoardClick}
							onPieceClick={handlers.handleBoardClick}
							onPieceDrag={(sq) => handlers.handlePieceDrag(sq)}
							canDragPiece={(sq) => handlers.canDragPiece(sq)}
							onPieceDrop={(src, tgt) => handlers.onPieceDrop(src, tgt)}
							onPromotionChoice={handlers.handlePromotionChoice}
							onCancelPromotion={() => handlers.handleSelectSquare(null)}
						/>
					</div>
				</div>
			</div>

			{/* Right col: Controls and info */}
			<div className="col-span-1">
				{!gameId ? (
					<GameModeTabs
						isCreating={isCreatingGame}
						error={error}
						onStartBotGame={handleStartBotGame}
					/>
				) : (
					<div>
						<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
							<ClockPanel
								gameFull={gameFull}
								whiteMs={whiteMs}
								blackMs={blackMs}
								activeColor={activeColor}
								timerOrder={timerOrder}
							/>
							{/* Game Actions */}
							<Controls
								onOfferDraw={handleOfferDraw}
								onResign={handleResign}
								onAbort={handleAbort}
								isConnected={isConnected}
								gameEnded={gameEnded}
								moveCount={moveCount}
							/>
						</div>

						{gameEnded && (
							<div className="mb-6">
								<button
									type="button"
									onClick={resetToLobby}
									className="rounded-lg bg-[rgb(var(--color-secondary-500))] px-4 py-2 text-sm font-medium text-[rgb(var(--color-fg-on-primary))] transition hover:bg-[rgb(var(--color-secondary-600))] disabled:opacity-50"
								>
									New Game
								</button>
							</div>
						)}

						{/* Connection status */}
						<div className="grid grid-cols-2 flex items-center mb-4">
							<h2 className="text-xl font-bold">Playing vs Bot</h2>
							<div className="text-sm text-[rgb(var(--color-fg-secondary))] justify-end flex mr-4">
								{gameEnded ? null : isConnected ? (
									<span className="text-[rgb(var(--color-success))]" title="Connected">
										Connected
									</span>
								) : isReconnecting ? (
									<span className="text-[rgb(var(--color-warning))]" title="Reconnecting">
										Reconnecting...
									</span>
								) : isOffline ? (
									<span className="text-[rgb(var(--color-error))]" title="Connection lost">
										{streamNotFound ? "Game Not Found" : "Offline"}
									</span>
								) : isConnecting ? (
									<span className="text-[rgb(var(--color-warning))]" title="Connecting">
										Connecting...
									</span>
								) : null}
							</div>
						</div>

						{streamError && (
							<div
								className="rounded bg-[rgb(var(--color-error)/0.1)] p-3 text-sm text-[rgb(var(--color-error))]"
								role="alert"
							>
								Error: {streamError}
							</div>
						)}

						{/* Game Info Panel */}
						<div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mt-4 mb-4">
							<h3 className="text-lg font-semibold">Game Info</h3>
							<dl className="mt-2 space-y-2 text-sm">
								<div className="flex justify-between">
									<dt className="text-gray-600 dark:text-gray-400">Game ID:</dt>
									<dd className="font-medium text-xs">{gameId}</dd>
								</div>
								{status && (
									<>
										<div className="flex justify-between">
											<dt className="text-gray-600 dark:text-gray-400">Status:</dt>
											<dd className="font-medium">{status}</dd>
										</div>
										{winner && (
											<div className="flex justify-between">
												<dt className="text-gray-600 dark:text-gray-400">Winner:</dt>
												<dd className="font-medium">{winner}</dd>
											</div>
										)}
									</>
								)}
							</dl>

							<div className="my-4 h-px bg-gray-100 dark:bg-gray-800" />

							<h3 className="text-lg font-semibold">Position</h3>
							<div className="mt-2 text-sm">
								<div className="text-gray-600 dark:text-gray-400">
									Turn: {boardState.chess.turn() === "w" ? "White" : "Black"}
								</div>
								<div className="mt-2 text-gray-600 dark:text-gray-400">
									{boardState.chess.isCheck() && "Check! "}
									{boardState.chess.isCheckmate() && "Checkmate! "}
									{boardState.chess.isStalemate() && "Stalemate! "}
									{boardState.chess.isDraw() && "Draw! "}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
