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
		<div className="flex flex-col md:flex-row h-full gap-4 min-h-0 w-full">
			{/* Left: Move List + Chessboard */}
			<div
				className={`flex-1 flex flex-row min-w-0 h-full transition-opacity gap-4 ${!gameId ? "opacity-80" : ""}`}
			>
				{/* Move List */}
				<div
					className={`${!gameId ? "invisible md:opacity-0 pointer-events-none" : ""} transition-opacity shrink-0 flex flex-col h-full overflow-hidden`}
				>
					<MoveList moves={boardState.moveHistory} visible={true} />
				</div>

				{/* Board */}
				<div className="flex-1 min-w-0 h-full flex items-center justify-center">
					<div className="aspect-square max-h-full shrink-0 max-w-full w-full relative">
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

			{/* Right: Info + Clocks + Controls */}
			<div className="w-full md:w-[400px] shrink-0 flex flex-col h-full min-h-0">
				{!gameId ? (
					<GameModeTabs
						isCreating={isCreatingGame}
						error={error}
						onStartBotGame={handleStartBotGame}
					/>
				) : (
					<div className="flex flex-col h-full justify-between relative min-h-0">
						{/* Info */}
						<div className="p-2 mb-4">
							<div className="font-semibold text-xl text-[rgb(var(--color-fg-secondary))]">
								{status && <span className="uppercase tracking-wide">{status}</span>}
							</div>

							<div className="font-medium">
								{boardState.chess.isCheck() && !boardState.chess.isCheckmate() && (
									<span className="text-[rgb(var(--color-warning))]">Check!</span>
								)}
								{boardState.chess.isCheckmate() && (
									<span className="text-[rgb(var(--color-error))]">Checkmate!</span>
								)}
								{winner && (
									<span className="ml-2 text-[rgb(var(--color-success))]">Winner: {winner}</span>
								)}
							</div>
							<span className="text-sm font-mono text-[rgb(var(--color-fg-secondary))] opacity-50">
								#{gameId}
							</span>
							<div className="text-sm font-medium">
								<div className="text-sm font-medium">
									{gameEnded ? (
										<span className="text-[rgb(var(--color-fg-secondary))]">Game Over</span>
									) : isConnected ? (
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
								<div className="mt-2 text-sm text-[rgb(var(--color-error))]">
									Error: {streamError}
								</div>
							)}
						</div>

						{/* Clocks */}
						<div className="absolute top-1/2 w-full -translate-y-1/2">
							<ClockPanel
								gameFull={gameFull}
								whiteMs={whiteMs}
								blackMs={blackMs}
								activeColor={activeColor}
								timerOrder={timerOrder}
							/>
						</div>

						{/* Game Actions */}
						<div className="p-2">
							<Controls
								onOfferDraw={handleOfferDraw}
								onResign={handleResign}
								onAbort={handleAbort}
								isConnected={isConnected}
								gameEnded={gameEnded}
								moveCount={moveCount}
							/>

							{gameEnded && (
								<button
									type="button"
									onClick={resetToLobby}
									className="mt-3 w-full rounded-lg bg-[rgb(var(--color-secondary-500))] px-4 py-2 text-sm font-medium text-[rgb(var(--color-fg-on-primary))] transition hover:bg-[rgb(var(--color-secondary-600))]"
								>
									New Game
								</button>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
