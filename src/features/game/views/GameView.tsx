import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGameSession } from "../hooks/useGameSession";

import { Board } from "../components/Board";
import { ClockPanel } from "../components/ClockPanel";
import { Controls } from "../components/GameActions";
import { MoveList } from "../components/MoveList";
import { GameModeTabs } from "./GameModeTabs";
import { GameResultModal } from "../components/GameResultModal";
import { GameStatus } from "../components/GameStatus";

export default function GameView() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [modalDismissed, setModalDismissed] = useState(false);

	const gameId = searchParams.get("game");

	const showResultsModal = () => {
		setModalDismissed(false);
	};

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

	const hasGame = !!gameId;

	return (
		<div className="flex h-full w-full flex-col game-view ">
			<div className="flex h-full min-h-0 w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-center">
				{/* RIGHT PANEL */}
				<div className="order-1 w-full shrink-0 flex flex-col lg:order-3 lg:h-[var(--board-size)] lg:w-90 lg:min-h-0">
					{!hasGame ? (
						<GameModeTabs
							isCreating={gameState.isCreatingGame}
							error={gameState.error}
							onStartBotGame={actions.startBotGame}
						/>
					) : (
						<div className="flex flex-col lg:h-full lg:min-h-0">
							{/* Status */}
							<div className="mb-2 shrink-0 p-2">
								<GameStatus
									gameEnded={gameState.gameEnded}
									winner={gameState.winner}
									status={gameState.status}
									myColor={gameState.myColor}
									isConnected={gameState.isConnected}
									isReconnecting={gameState.isReconnecting}
									isOffline={gameState.isOffline}
									isConnecting={gameState.isConnecting}
									streamNotFound={gameState.streamNotFound}
									error={gameState.error}
								/>
							</div>
							{/* Clocks*/}
							<div className="shrink-0 min-h-[8rem]" />
							<div className="lg:flex lg:flex-1 lg:min-h-0 lg:items-center lg:justify-left">
								<ClockPanel
									gameFull={gameState.gameFull}
									whiteMs={clockState.whiteMs}
									blackMs={clockState.blackMs}
									activeColor={clockState.activeColor}
									timerOrder={gameState.timerOrder}
									captured={capturedState.captured}
									whiteDiff={capturedState.whiteDiff}
									blackDiff={capturedState.blackDiff}
									gameEnded={gameState.gameEnded}
									winner={gameState.winner}
									myColor={gameState.myColor}
								/>
							</div>
							{/* Controls */}
							<div className="shrink-0 min-h-[14rem] lg:flex lg:items-end lg:justify-left">
								<Controls
									onOfferDraw={actions.offerDraw}
									onResign={actions.resign}
									onAbort={actions.abort}
									onTakeback={actions.takeback}
									onRematch={actions.rematch}
									onNewGame={actions.resetToLobby}
									onShowResults={showResultsModal}
									isConnected={gameState.isConnected}
									gameEnded={gameState.gameEnded}
									moveCount={historyState.totalMoves}
									modalDismissed={modalDismissed}
									drawOfferedByMe={gameState.drawOfferedByMe}
									drawOfferedByOpponent={gameState.drawOfferedByOpponent}
									takebackOfferedByMe={gameState.takebackOfferedByMe}
									takebackOfferedByOpponent={gameState.takebackOfferedByOpponent}
									rematchPending={gameState.rematchPending}
									isBotGame={gameState.isBotGame}
								/>
							</div>
						</div>
					)}
				</div>

				{/* CENTER PANEL*/}
				<div
					className={`order-2 flex w-full justify-center lg:order-2 lg:h-[var(--board-size)] lg:flex-1 lg:min-w-0 ${
						!hasGame ? "opacity-80" : ""
					}`}
				>
					<div className="relative aspect-square w-full max-h-[calc(95vh-4rem)] max-w-full shrink-0 lg:h-[var(--board-size)] lg:w-[var(--board-size)]">
						<Board viewModel={boardViewModel} />
					</div>
				</div>

				{/* LEFT PANEL*/}
				<div
					className={`order-3 w-full shrink-0 flex flex-col lg:overflow-hidden lg:order-1 lg:h-[var(--board-size)] lg:w-60 lg:min-h-0 ${
						!hasGame ? "invisible pointer-events-none" : ""
					}`}
				>
					<MoveList
						moves={historyState.moveHistory}
						visible={true}
						viewingMoveIndex={historyState.viewingMoveIndex}
						onMoveClick={historyState.goToMove}
						onGoToStart={historyState.goToStart}
						onGoBack={historyState.goBack}
						onGoForward={historyState.goForward}
						onGoToLive={historyState.goToLive}
					/>
				</div>
			</div>

			{hasGame && gameState.gameEnded && !modalDismissed && (
				<GameResultModal
					winner={gameState.winner}
					reason={gameState.status}
					myColor={gameState.myColor}
					gameFull={gameState.gameFull}
					ratingDelta={gameState.ratingDelta}
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
