import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Chessboard, type ChessboardOptions } from "react-chessboard";
import { Chess, type Move as ChessMove, type Square } from "chess.js";
import { useAuth } from "../auth/AuthProvider";
import { getPlayerColor, isPlayerInGame, uciToMove, moveToUci } from "../../libs/game";
import { startBotGame, resignGame, abortGame } from "./gameActions";
import { gameStream } from "./gameStream";
import { GameColor } from "../../generated/types/gameColor";
import { GameStatusName } from "../../generated/types/gameStatusName";

const getGameIdFromURL = (): string | null => {
	try {
		return new URLSearchParams(window.location.search).get("game");
	} catch {
		return null;
	}
};

const setGameIdInURL = (id: string | null) => {
	try {
		const url = new URL(window.location.href);
		if (id) url.searchParams.set("game", id);
		else url.searchParams.delete("game");
		window.history.replaceState(null, "", url);
	} catch {}
};

const findKingSquare = (board: Chess, color: "w" | "b"): Square | null => {
	const matrix = board.board();
	for (let rank = 0; rank < matrix.length; rank += 1) {
		for (let file = 0; file < matrix[rank].length; file += 1) {
			const piece = matrix[rank][file];
			if (piece && piece.type === "k" && piece.color === color) {
				const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
				const rankChar = (8 - rank).toString();
				return `${fileChar}${rankChar}` as Square;
			}
		}
	}
	return null;
};

export default function GameView() {
	const { user } = useAuth();

	const [gameId, setGameId] = useState<string | null>(() => getGameIdFromURL());
	const [chess, setChess] = useState(new Chess());
	const chessRef = useRef(chess);
	const [isCreatingGame, setIsCreatingGame] = useState(false);
	const [selectedLevel, setSelectedLevel] = useState(1);
	const [error, setError] = useState<string | null>(null);

	// stream state
	const { gameFull, gameState, isConnected, error: streamError, makeMove } = gameStream(gameId);

	// uci overlay
	const [pendingUci, setPendingUci] = useState<string | null>(null);
	const latestConfirmedMovesRef = useRef<string>("");
	const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
	const [lastMoveSquares, setLastMoveSquares] = useState<{
		from: Square | null;
		to: Square | null;
	}>({ from: null, to: null });
	const [checkSquare, setCheckSquare] = useState<Square | null>(null);

	const gameEnded = !!(gameState?.status && gameState.status !== GameStatusName.started);
	const myColor = getPlayerColor(gameFull, user);
	const playerColor = myColor === GameColor.white ? "w" : "b";

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

		const tokens = source.split(" ").filter(Boolean);
		if (tokens.length > 0) {
			const { from, to } = uciToMove(tokens[tokens.length - 1]);
			setLastMoveSquares({ from: from as Square, to: to as Square });
		} else {
			setLastMoveSquares({ from: null, to: null });
		}

		setChess(next);
	}, [gameFull, gameState, pendingUci]);

	useEffect(() => {
		chessRef.current = chess;

		if (selectedSquare) {
			const piece = chess.get(selectedSquare);
			if (!piece || piece.color !== playerColor) {
				setSelectedSquare(null);
			}
		}

		if (chess.isCheck()) {
			setCheckSquare(findKingSquare(chess, chess.turn()) ?? null);
		} else {
			setCheckSquare(null);
		}
	}, [chess, playerColor, selectedSquare]);

	// show gameID change in url
	useEffect(() => {
		setGameIdInURL(gameId);
	}, [gameId]);

	// remove gameID from url
	useEffect(() => {
		if (gameEnded) setGameIdInURL(null);
	}, [gameEnded]);

	const handleStartGame = async () => {
		setIsCreatingGame(true);
		setError(null);
		try {
			// TODO: more options
			const { gameId } = await startBotGame(selectedLevel, { limit: 300, increment: 3 });
			setPendingUci(null);
			setChess(new Chess());
			setGameId(gameId);
		} catch (error) {
			setError(error instanceof Error ? error.message : "Failed to create game");
		} finally {
			setIsCreatingGame(false);
		}
	};

	const handleResign = async () => {
		if (!gameId || !isConnected) return;
		try {
			await resignGame(gameId);
			setGameIdInURL(null);
		} catch (e) {
			console.error("Resign failed:", e);
		}
	};

	const handleAbort = async () => {
		if (!gameId || !isConnected) return;
		try {
			await abortGame(gameId);
			setGameIdInURL(null);
		} catch (e) {
			console.error("Abort failed:", e);
		}
	};

	const ownsSquare = (square: Square) => {
		const piece = chessRef.current.get(square);
		return Boolean(piece && piece.color === playerColor);
	};

	const handleSelectSquare = (square: Square | null) => {
		if (!square) {
			setSelectedSquare(null);
			return;
		}
		if (selectedSquare === square) {
			setSelectedSquare(null);
			return;
		}
		if (ownsSquare(square)) {
			setSelectedSquare(square);
		} else {
			setSelectedSquare(null);
		}
	};

	const handleSquareClick: ChessboardOptions["onSquareClick"] = ({ square }) => {
		if (!square) return;
		const next = square as Square;
		if (ownsSquare(next)) {
			handleSelectSquare(next);
			return;
		}
		setSelectedSquare(null);
	};

	const handlePieceClick: ChessboardOptions["onPieceClick"] = ({ square }) => {
		if (!square) return;
		const next = square as Square;
		if (ownsSquare(next)) {
			handleSelectSquare(next);
			return;
		}
		setSelectedSquare(null);
	};

	const handlePieceDrag: ChessboardOptions["onPieceDrag"] = ({ square }) => {
		if (!square) return;
		const next = square as Square;
		if (!ownsSquare(next)) return;
		if (selectedSquare !== next) {
			setSelectedSquare(next);
		}
	};

	const canDragPiece: ChessboardOptions["canDragPiece"] = ({ square }) => {
		if (!square) return false;
		return ownsSquare(square as Square);
	};

	const onPieceDrop = (args: {
		piece: { pieceType: string; isSparePiece: boolean; position: string };
		sourceSquare: string;
		targetSquare: string | null;
	}): boolean => {
		const { sourceSquare, targetSquare } = args;
		if (!targetSquare) return false;
		if (!isConnected) return false;
		if (pendingUci) return false;
		if (gameEnded) return false;

		if (!isPlayerInGame(gameFull, user)) return false;

		const board = chessRef.current;
		if (board.turn() !== playerColor) return false;

		try {
			const piece = board.get(sourceSquare as Square);

			// todo: handle promotions properly
			const isPromo =
				piece?.type === "p" &&
				((piece.color === "w" && targetSquare[1] === "8") ||
					(piece.color === "b" && targetSquare[1] === "1"));

			const test = new Chess(board.fen());
			const move = test.move({
				from: sourceSquare,
				to: targetSquare,
				promotion: isPromo ? "q" : undefined,
			});
			if (!move) return false;

			const uci = moveToUci({ from: sourceSquare, to: targetSquare, promotion: move.promotion });
			setPendingUci(uci);
			setSelectedSquare(null);

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

	const legalMoves = useMemo<ChessMove[]>(() => {
		if (!selectedSquare) return [];
		try {
			return chess.moves({ square: selectedSquare, verbose: true }) as ChessMove[];
		} catch {
			return [];
		}
	}, [chess, selectedSquare]);
	const squareStyles = useMemo<Record<string, CSSProperties>>(() => {
		const styles: Record<string, CSSProperties> = {};

		const appendShadow = (square: Square | null, shadow: string) => {
			if (!square) return;
			const previous = styles[square] ?? {};
			const nextShadow = previous.boxShadow ? `${previous.boxShadow}, ${shadow}` : shadow;
			styles[square] = { ...previous, boxShadow: nextShadow };
		};

		const tintSquare = (square: Square | null, color: string) => {
			if (!square) return;
			appendShadow(square, `inset 0 0 0 9999px ${color}`);
		};

		// Last move
		tintSquare(lastMoveSquares.from, "rgb(var(--color-chess-move-last) / 0.37)");
		tintSquare(lastMoveSquares.to, "rgb(var(--color-chess-move-last) / 0.37)");

		// Selected square
		if (selectedSquare) {
			tintSquare(selectedSquare, "rgb(var(--color-primary-400) / 0.22)");
			appendShadow(selectedSquare, "inset 0 0 0 2px rgb(var(--color-primary-500) / 0.9)");
		}

		// Legal moves for currently selected piece
		for (const move of legalMoves) {
			const target = move.to as Square;

			if (move.isCapture()) {
				// Capture possible
				styles[target] = {
					...styles[target],
					backgroundImage:
						"radial-gradient(circle, rgb(var(--color-chess-move-draw) / 0.8) 0, rgb(var(--color-chess-move-draw) / 0.8) 65%, transparent 70%)",
					backgroundRepeat: "no-repeat",
					backgroundPosition: "center",
					backgroundSize: "100% 100%",
				};
			} else {
				// Quiet move
				styles[target] = {
					...styles[target],
					backgroundImage:
						"radial-gradient(circle, rgb(var(--color-chess-move-legal-dot) / 0.2) 0, rgb(var(--color-chess-move-legal-dot) / 0.2) 32%, transparent 36%)",
					backgroundRepeat: "no-repeat",
					backgroundPosition: "center",
					backgroundSize: "38% 38%",
				};
			}
		}

		// King in check: red square overlay (stays as full-square tint)
		if (checkSquare) {
			tintSquare(checkSquare, "rgb(var(--color-chess-in-check) / 0.18)");
			appendShadow(checkSquare, "inset 0 0 0 2px rgb(var(--color-chess-in-check) / 0.9)");
		}

		return styles;
	}, [checkSquare, lastMoveSquares, legalMoves, selectedSquare]);

	const movesList = chess.history();

	return (
		<div className="rounded-2xl border border-[rgb(var(--color-surface-border)/0.7)] bg-[rgb(var(--color-surface-card))] p-6 text-[rgb(var(--color-fg-primary))] shadow-[0_25px_65px_rgba(0,0,0,0.35)]">
			<div className="grid gap-6 md:grid-cols-2">
				{/* Left col: Board */}
				<div className={`md:col-span-1 transition-opacity ${!gameId ? "opacity-75" : ""}`}>
					<div className="aspect-square w-full max-w-full rounded-3xl border border-[rgb(var(--color-surface-border)/0.6)] bg-[rgb(var(--color-surface-base))] p-3">
						<div className="size-full">
							<Chessboard
								options={{
									position: chess.fen(),
									boardOrientation: myColor,
									onPieceDrop,
									onSquareClick: handleSquareClick,
									onPieceClick: handlePieceClick,
									onPieceDrag: handlePieceDrag,
									canDragPiece,
									squareStyles,
								}}
							/>
						</div>
					</div>
				</div>

				{/* Right col: Controls and info */}
				<div className="col-span-1">
					{!gameId ? (
						<div>
							<h2 className="text-xl font-bold">Play against bot</h2>
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
					) : (
						<div>
							<div className="grid grid-cols-2 flex items-center mb-4">
								<h2 className="text-xl font-bold">Playing vs Bot</h2>
								<div className="text-sm text-gray-600 dark:text-gray-400 justify-end flex mr-4">
									{isConnected ? (
										<span className="text-green-600">Connected</span>
									) : (
										<span>Connecting...</span>
									)}
								</div>
							</div>

							{streamError && (
								<div className="rounded bg-red-50 p-3 text-sm text-red-600">
									Error: {streamError}
								</div>
							)}

							<div className="flex gap-2">
								<button
									type="button"
									onClick={handleResign}
									disabled={!isConnected || gameEnded}
									className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
								>
									Resign
								</button>
								<button
									type="button"
									onClick={handleAbort}
									disabled={!isConnected || gameEnded}
									className="rounded bg-yellow-600 px-4 py-2 text-sm text-white hover:bg-yellow-700 disabled:opacity-50"
								>
									Abort
								</button>
								<button
									type="button"
									onClick={() => {
										setGameId(null);
										setChess(new Chess());
										setPendingUci(null);
										latestConfirmedMovesRef.current = "";
									}}
									className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
								>
									New Game
								</button>
							</div>

							<div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mt-4 mb-4">
								<h3 className="text-lg font-semibold">Game Info</h3>
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

								<div className="my-4 h-px bg-gray-100 dark:bg-gray-800" />

								<h3 className="text-lg font-semibold">Position</h3>
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

								<div className="my-4 h-px bg-gray-100 dark:bg-gray-800" />

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
					)}
				</div>
			</div>
		</div>
	);
}
