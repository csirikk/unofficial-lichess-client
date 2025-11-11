import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square } from "chess.js";
import { useAuth } from "../auth/AuthProvider";
import { getPlayerColor, isPlayerInGame, uciToMove, moveToUci } from "../../libs/game";
import { startBotGame } from "./gameActions";
import { gameStream } from "./gameStream";
import { GameColor } from "../../generated/types/gameColor";

export default function GameView() {
	const { user } = useAuth();

	const [gameId, setGameId] = useState<string | null>(null);
	const [chess, setChess] = useState(new Chess());
	const [isCreatingGame, setIsCreatingGame] = useState(false);
	const [selectedLevel, setSelectedLevel] = useState(1);
	const [error, setError] = useState<string | null>(null);

	// stream state
	const { gameFull, gameState, isConnected, error: streamError, makeMove } = gameStream(gameId);

	// uci overlay
	const [pendingUci, setPendingUci] = useState<string | null>(null);
	const latestConfirmedMovesRef = useRef<string>("");

	// Rebuild chess position from confirmed + pending move
	useEffect(() => {
		if (!gameFull && !gameState) return;

		const next = new Chess();

		const confirmed = gameState?.moves ?? gameFull?.state?.moves ?? "";
		latestConfirmedMovesRef.current = confirmed;

		let source = confirmed;
		if (pendingUci) {
			const tokens = confirmed.split(" ").filter(Boolean);
			const streamHasPending = tokens.includes(pendingUci);
			if (!streamHasPending) source = confirmed ? `${confirmed} ${pendingUci}` : pendingUci;
			else setPendingUci(null);
		}

		if (source) {
			for (const uci of source.split(" ").filter(Boolean)) {
				try {
					next.move(uciToMove(uci));
				} catch (error) {
					console.error("Invalid move:", uci, error);
				}
			}
		}
		setChess(next);
	}, [gameFull, gameState, pendingUci]);

	const myColor = getPlayerColor(gameFull, user);

	const handleStartGame = async () => {
		setIsCreatingGame(true);
		setError(null);
		try {
			// TODO: more options
			const { gameId } = await startBotGame(selectedLevel, { limit: 300, increment: 3 });
			setGameId(gameId);
		} catch (error) {
			setError(error instanceof Error ? error.message : "Failed to create game");
		} finally {
			setIsCreatingGame(false);
		}
	};

	const onPieceDrop = (args: {
		piece: { pieceType: string; isSparePiece: boolean; position: string };
		sourceSquare: string;
		targetSquare: string | null;
	}): boolean => {
		const { sourceSquare, targetSquare } = args;
		if (!targetSquare) return false;
		if (pendingUci) return false;

		if (!isPlayerInGame(gameFull, user)) return false;

		const playerColor = myColor === GameColor.white ? "w" : "b";
		if (chess.turn() !== playerColor) return false;

		try {
			const piece = chess.get(sourceSquare as Square);

			// todo: handle promotions properly
			const isPromo =
				piece?.type === "p" &&
				((piece.color === "w" && targetSquare[1] === "8") ||
					(piece.color === "b" && targetSquare[1] === "1"));

			const test = new Chess(chess.fen());
			const move = test.move({
				from: sourceSquare,
				to: targetSquare,
				promotion: isPromo ? "q" : undefined,
			});
			if (!move) return false;

			const uci = moveToUci({ from: sourceSquare, to: targetSquare, promotion: move.promotion });
			setPendingUci(uci);

			(async () => {
				try {
					await makeMove(uci);
				} catch (error) {
					console.error("Failed to send move:", error);
					setPendingUci(null);
					const confirmed = latestConfirmedMovesRef.current ?? "";
					const rollback = new Chess();
					for (const u of confirmed.split(" ").filter(Boolean)) {
						try {
							rollback.move(uciToMove(u));
						} catch {}
					}
					setChess(rollback);
				}
			})();

			return true;
		} catch {
			return false;
		}
	};

	// creation ui
	if (!gameId) {
		return (
			<div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
				<h2 className="text-2xl font-semibold">Play against bot</h2>

				<div className="mt-4 space-y-4">
					<div>
						<label htmlFor="level" className="block text-sm text-gray-600 dark:text-gray-400">
							Bot strength (1-8)
						</label>
						<input
							id="level"
							type="range"
							min="1"
							max="8"
							value={selectedLevel}
							onChange={(e) => setSelectedLevel(Number(e.target.value))}
							className="w-full h-2 rounded-lg bg-gray-200 dark:bg-gray-700 appearance-none cursor-pointer"
						/>
						<div className="mt-1 text-sm">Level {selectedLevel}</div>
					</div>

					{error && (
						<div className="rounded bg-red-50 p-4 text-sm text-red-600">Error: {error}</div>
					)}

					<button
						type="button"
						onClick={handleStartGame}
						disabled={isCreatingGame}
						className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
					>
						{isCreatingGame ? " Creating game..." : "Start Game"}
					</button>
				</div>
			</div>
		);
	}

	// game active
	const movesList = chess.history();

	return (
		<div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-bold">Playing vs Bot</h2>
					<div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
						{isConnected ? (
							<span className="text-green-600">Connected</span>
						) : (
							<span>Connecting...</span>
						)}
					</div>
				</div>
				<button
					type="button"
					onClick={() => {
						setGameId(null);
						setChess(new Chess());
						setPendingUci(null);
						latestConfirmedMovesRef.current = "";
					}}
					className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
				>
					New Game
				</button>
			</div>

			{streamError && (
				<div className="rounded bg-red-50 p-4 text-sm text-red-600">Error: {streamError}</div>
			)}

			<div className="mt-6 grid gap-6 md:grid-cols-2">
				<Chessboard
					options={{
						position: chess.fen(),
						boardOrientation: myColor,
						onPieceDrop,
					}}
				/>

				<div className="space-y-4">
					<div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
						<h3 className="mb-2 text-lg font-semibold">Game Info</h3>
						<dl className="mt-2 space-y-2 text-sm">
							<div className="flex justify-between">
								<dt className="text-gray-600 dark:text-gray-400">Game ID:</dt>
								<dd className="font-medium text-xs">{gameId}</dd>
							</div>
							{gameState && (
								<>
									<div className="flex justify-between">
										<dt className="text-gray-600 dark:text-gray-400">Status:</dt>
										<dd className="font-medium">{gameState.status}</dd>
									</div>
									{gameState.winner && (
										<div className="flex justify-between">
											<dt className="text-gray-600 dark:text-gray-400">Winner:</dt>
											<dd className="font-medium">{gameState.winner}</dd>
										</div>
									)}
								</>
							)}
						</dl>
					</div>

					<div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
						<h3 className="mb-2 text-lg font-semibold">Position</h3>
						<div className="mt-2 text-sm">
							<div className="text-gray-600 dark:text-gray-400">
								Turn: {chess.turn() === "w" ? "White" : "Black"}
							</div>
							<div className="mt-2 text-gray-600 dark:text-gray-400">
								{chess.isCheck() && "Check! "}
								{chess.isCheckmate() && "Checkmate! "}
								{chess.isStalemate() && "Stalemate! "}
								{chess.isDraw() && "Draw! "}
							</div>
						</div>
					</div>

					<div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
						<h3 className="mb-2 text-lg font-semibold">Move History</h3>
						<div className="mt-2 max-h-48 overflow-y-auto text-sm font-mono">
							{movesList.length === 0 ? (
								<span className="text-gray-600 dark:text-gray-400">No moves yet</span>
							) : (
								movesList.map((move, i) => (
									<span
										// stable-ish key without using the raw index:
										key={movesList.slice(0, i + 1).join(" ")}
										className="mr-2"
									>
										{i % 2 === 0 && `${Math.floor(i / 2) + 1}. `}
										{move}
									</span>
								))
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
