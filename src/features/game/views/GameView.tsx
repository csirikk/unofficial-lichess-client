import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGameSession } from "../hooks/useGameSession";

import { Board } from "../components/Board";
import { Button } from "../../../components/Button";
import { ClockPanel } from "../components/ClockPanel";
import { Controls } from "../components/GameActions";
import { HistoryControls } from "../components/HistoryControls";
import { MoveList } from "../components/MoveList";
import { GameModeTabs } from "./GameModeTabs";
import { GameResultModal } from "../components/GameResultModal";

export default function GameView() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [modalDismissed, setModalDismissed] = useState(false);

	const gameId = searchParams.get("game");

	const updateGameId = (newId: string | null) => {
		if (newId) {
			setSearchParams({ game: newId });
		} else {
			setSearchParams({});
		}
	};

	const session = useGameSession(gameId, updateGameId);
	const { boardViewModel, clockState, historyState, capturedState, gameState, actions } = session;

	useEffect(() => {
		if (gameState.gameEnded) {
			setModalDismissed(false);
		}
	}, [gameState.gameEnded]);

	return (
		<div className="flex flex-col md:flex-row h-full gap-4 min-h-0 w-full">
			{/* Left Column: Move List + Chessboard */}
			<div
				className={`flex-1 flex flex-row min-w-0 h-full transition-opacity gap-4 ${
					!gameId ? "opacity-80" : ""
				}`}
			>
				{/* Move List */}
				<div
					className={`${
						!gameId ? "invisible pointer-events-none" : ""
					} transition-opacity shrink-0 flex flex-col h-full overflow-hidden`}
				>
					<MoveList
						moves={historyState.moveHistory}
						visible={true}
						viewingMoveIndex={historyState.viewingMoveIndex}
						onMoveClick={historyState.goToMove}
					/>
					<HistoryControls
						onGoToStart={historyState.goToStart}
						onGoBack={historyState.goBack}
						onGoForward={historyState.goForward}
						onGoToLive={historyState.goToLive}
						isViewingHistory={historyState.isViewingHistory}
						viewingMoveIndex={historyState.viewingMoveIndex}
						totalMoves={historyState.totalMoves}
					/>
				</div>
				{/* Chessboard */}
				<div className="flex-1 min-w-0 h-full flex items-center justify-center">
					<div className="aspect-square max-h-full shrink-0 max-w-full w-full relative">
						<Board viewModel={boardViewModel} />
					</div>
				</div>
			</div>

			{/* Right Column: Info + Clocks + Controls */}
			<div className="w-full md:w-1/3 md:max-w-lg shrink-0 flex flex-col h-full min-h-0">
				{!gameId ? (
					<GameModeTabs
						isCreating={gameState.isCreatingGame}
						error={gameState.error}
						onStartBotGame={actions.startBotGame}
					/>
				) : (
					<div className="flex flex-col h-full justify-between relative min-h-0">
						{/* Status Header */}
						<div className="p-2 mb-4">
							<div className="font-semibold text-xl text-[rgb(var(--color-fg-secondary))]">
								{gameState.status && (
									<span className="uppercase tracking-wide">{gameState.status}</span>
								)}
							</div>

							<div className="font-medium">
								{boardViewModel.displayState.checkSquare && !gameState.gameEnded && (
									<span className="text-[rgb(var(--color-warning))]">Check!</span>
								)}
								{gameState.winner && (
									<span className="ml-2 text-[rgb(var(--color-success))]">
										Winner: {gameState.winner}
									</span>
								)}
							</div>
							<span className="text-sm font-mono text-[rgb(var(--color-fg-secondary))] opacity-50">
								#{gameId}
							</span>
							<div className="text-sm font-medium">
								{gameState.gameEnded ? (
									<span className="text-[rgb(var(--color-fg-secondary))]">Game Over</span>
								) : gameState.isConnected ? (
									<span className="text-[rgb(var(--color-success))]" title="Connected">
										Connected
									</span>
								) : gameState.isReconnecting ? (
									<span className="text-[rgb(var(--color-warning))]" title="Reconnecting">
										Reconnecting...
									</span>
								) : gameState.isOffline ? (
									<span className="text-[rgb(var(--color-error))]" title="Connection lost">
										{gameState.streamNotFound ? "Game Not Found" : "Offline"}
									</span>
								) : gameState.isConnecting ? (
									<span className="text-[rgb(var(--color-warning))]" title="Connecting">
										Connecting...
									</span>
								) : null}
							</div>
							{gameState.error && (
								<div className="mt-2 text-sm text-[rgb(var(--color-error))]">
									Error: {gameState.error}
								</div>
							)}
						</div>

						{/* Clocks */}
						<div className="absolute top-1/2 w-full -translate-y-1/2">
							<ClockPanel
								gameFull={gameState.gameFull}
								whiteMs={clockState.whiteMs}
								blackMs={clockState.blackMs}
								activeColor={clockState.activeColor}
								timerOrder={gameState.timerOrder}
								captured={capturedState.captured}
								whiteDiff={capturedState.whiteDiff}
								blackDiff={capturedState.blackDiff}
							/>
						</div>

						{/* Game Actions */}
						<div className="p-2">
							<Controls
								onOfferDraw={actions.offerDraw}
								onResign={actions.resign}
								onAbort={actions.abort}
								isConnected={gameState.isConnected}
								gameEnded={gameState.gameEnded}
								moveCount={historyState.totalMoves}
							/>

							<div className="flex flex-col gap-3 mt-3">
								{gameState.gameEnded && (
									<>
										<Button
											variant="outline"
											fullWidth
											onClick={() => setModalDismissed(false)}
											disabled={!modalDismissed}
										>
											Show Results
										</Button>

										<Button variant="secondary" fullWidth onClick={actions.resetToLobby}>
											New Game
										</Button>
									</>
								)}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Game Result Modal */}
			{gameId && gameState.gameEnded && !modalDismissed && (
				<GameResultModal
					winner={gameState.winner}
					reason={gameState.status}
					myColor={gameState.myColor}
					ratingDelta={null}
					onRematch={() => {
						// TODO: Implement rematch logic
						console.log("Rematch requested");
					}}
					onNewGame={() => {
						actions.resetToLobby();
						setModalDismissed(true);
					}}
					onDismiss={() => setModalDismissed(true)}
				/>
			)}
		</div>
	);
}
