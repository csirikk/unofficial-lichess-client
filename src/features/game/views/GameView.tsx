/**
 * GameView.tsx
 *
 * Main game view component, orchestrating board, clocks, move list, and controls.
 */

import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useGameSession } from "../hooks/useGameSession";

import { Board } from "../components/Board";
import { ClockPanel } from "../components/ClockPanel";
import { Controls } from "../components/GameActions";
import { MoveList } from "../components/MoveList";
import { GameSetupView } from "./GameSetupView";
import { GameResultModal } from "../components/GameResultModal";
import { GameStatus } from "../components/GameStatus";

export default function GameView() {
	const [searchParams, setSearchParams] = useSearchParams();
	const gameId = searchParams.get("game");

	const updateGameId = useCallback(
		(newId: string | null) => {
			if (newId) {
				setSearchParams({ game: newId });
			} else {
				setSearchParams({});
			}
		},
		[setSearchParams],
	);

	const session = useGameSession(gameId, updateGameId);
	const { gameModel, boardViewModel, historyState, capturedState, sessionState, actions } = session;

	const shouldShowGameUI = !!gameId;
	const isDataReady = !!gameModel;

	return (
		<div className="flex h-full w-full flex-col game-view overflow-hidden">
			<div className="flex h-full min-h-0 w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-center">
				{/* RIGHT PANEL */}
				<div
					className={`
						order-1 w-full shrink-0 flex flex-col 
						lg:order-3 lg:h-(--board-size) lg:min-h-0 
						transition-all duration-300 ease-in-out
						${shouldShowGameUI ? "lg:w-90" : "lg:w-120"} 
						`}
				>
					{!shouldShowGameUI ? (
						<GameSetupView
							isCreating={sessionState.isCreatingGame}
							waitingForGame={sessionState.waitingForGame}
							error={sessionState.error}
							onStartBotGame={actions.startBotGame}
							onStartOnlineGame={actions.startOnlineGame}
							onCancelSeek={actions.cancelSeek}
						/>
					) : isDataReady ? (
						<div className="flex flex-col lg:h-full lg:min-h-0 fade-in duration-300">
							{/* Status */}
							<div className="mb-2 shrink-0">
								<GameStatus
									status={gameModel.status}
									info={gameModel.info}
									network={sessionState}
								/>
							</div>
							{/* Clocks*/}
							<div className="shrink-0 min-h-4" />
							<div className="lg:flex lg:flex-1 lg:min-h-0 lg:items-center lg:justify-left">
								<ClockPanel
									clock={gameModel.clock}
									whitePlayer={gameModel.players.white}
									blackPlayer={gameModel.players.black}
									timerOrder={sessionState.timerOrder}
									material={capturedState}
									ratingChanges={gameModel.ratingChanges}
								/>
							</div>
							{/* Controls */}
							<div className="shrink-0 min-h-56 lg:flex lg:items-end lg:justify-left">
								<Controls
									onOfferDraw={actions.offerDraw}
									onResign={actions.resign}
									onAbort={actions.abort}
									onTakeback={actions.takeback}
									onRematch={actions.rematch}
									onNewGame={actions.resetToLobby}
									onShowResults={actions.showResultsModal}
									isConnected={sessionState.isConnected}
									totalMoves={historyState.totalMoves}
									isModalDismissed={sessionState.modalDismissed}
									offers={gameModel.offers}
									status={gameModel.status}
									players={gameModel.players}
								/>
							</div>
						</div>
					) : (
						<div className="flex h-full items-center justify-center">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
						</div>
					)}
				</div>

				{/* CENTER PANEL*/}
				<div
					className={`order-2 flex w-full justify-center lg:order-2 lg:h-(--board-size) lg:flex-1 lg:min-w-0 transition-opacity duration-300 ${
						!shouldShowGameUI ? "opacity-80" : "opacity-100"
					}`}
				>
					<div className="relative aspect-square w-full max-h-[calc(95vh-4rem)] max-w-full shrink-0 lg:h-(--board-size) lg:w-(--board-size)">
						{boardViewModel && <Board viewModel={boardViewModel} />}
					</div>
				</div>

				{/* LEFT PANEL*/}
				<div
					className={`
						order-3 shrink-0 flex flex-col lg:order-1 lg:h-(--board-size) lg:min-h-0
						overflow-hidden whitespace-nowrap
						transition-all duration-300 ease-in-out ${
							shouldShowGameUI
								? "w-full opacity-100 lg:w-60 translate-x-0"
								: "w-0 opacity-0 lg:-translate-x-20 pointer-events-none"
						}`}
				>
					<div className="min-w-60 h-full">
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
			</div>

			{shouldShowGameUI &&
				sessionState.isGameEnded &&
				!sessionState.modalDismissed &&
				gameModel && (
					<GameResultModal
						game={gameModel}
						onRematch={actions.rematch}
						onNewGame={() => {
							actions.resetToLobby();
							actions.dismissResultsModal();
						}}
						onDismiss={actions.dismissResultsModal}
					/>
				)}
		</div>
	);
}
