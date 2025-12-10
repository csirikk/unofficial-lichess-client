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
	const { gameModel, boardViewModel, historyState, capturedState, sessionState, actions } = session;

	useEffect(() => {
		if (sessionState.isGameEnded) {
			setModalDismissed(false);
		}
	}, [sessionState.isGameEnded]);

	const hasGame = !!gameId && !!gameModel;

	return (
		<div className="flex h-full w-full flex-col game-view ">
			<div className="flex h-full min-h-0 w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-center">
				{/* RIGHT PANEL */}
				<div className="order-1 w-full shrink-0 flex flex-col lg:order-3 lg:h-(--board-size) lg:w-90 lg:min-h-0">
					{!hasGame ? (
						<GameModeTabs
							isCreating={sessionState.isCreatingGame}
							waitingForGame={sessionState.waitingForGame}
							error={sessionState.error}
							onStartBotGame={actions.startBotGame}
							onStartOnlineGame={actions.startOnlineGame}
						/>
					) : gameModel ? (
						<div className="flex flex-col lg:h-full lg:min-h-0">
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
									onShowResults={showResultsModal}
									isConnected={sessionState.isConnected}
									totalMoves={historyState.totalMoves}
									isModalDismissed={modalDismissed}
									offers={gameModel.offers}
									status={gameModel.status}
									players={gameModel.players}
								/>
							</div>
						</div>
					) : null}
				</div>

				{/* CENTER PANEL*/}
				<div
					className={`order-2 flex w-full justify-center lg:order-2 lg:h-(--board-size) lg:flex-1 lg:min-w-0 ${
						!hasGame ? "opacity-80" : ""
					}`}
				>
					<div className="relative aspect-square w-full max-h-[calc(95vh-4rem)] max-w-full shrink-0 lg:h-(--board-size) lg:w-(--board-size)">
						<Board viewModel={boardViewModel} />
					</div>
				</div>

				{/* LEFT PANEL*/}
				<div
					className={`order-3 w-full shrink-0 flex flex-col lg:overflow-hidden lg:order-1 lg:h-(--board-size) lg:w-60 lg:min-h-0 ${
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

			{hasGame && sessionState.isGameEnded && !modalDismissed && gameModel && (
				<GameResultModal
					game={gameModel}
					onRematch={actions.rematch}
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
