import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
	Chessboard,
	type ChessboardOptions,
	type PieceDropHandlerArgs,
	defaultPieces,
	type PieceRenderObject,
	getRelativeCoords,
} from "react-chessboard";
import { Chess, type Move as ChessMove, type Square } from "chess.js";
import { Flag, Handshake, CircleX } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { getPlayerColor, isPlayerInGame, uciToMove, moveToUci } from "../../libs/game";
import { startBotGame, resignGame, abortGame, offerDraw } from "./gameActions";
import { gameStream } from "./gameStream";
import { GameColor } from "../../generated/types/gameColor";
import { GameStatusName } from "../../generated/types/gameStatusName";
import { useGameClock } from "./gameClock";

type PromotionPiece = "q" | "r" | "b" | "n";

type PromotionRequest = {
	from: Square;
	to: Square;
	color: "w" | "b";
} | null;

type PromotionDropdownMetrics = {
	left: number;
	top: number;
	squareSize: number;
	direction: "down" | "up";
};

const PROMOTION_PIECES: PromotionPiece[] = ["q", "r", "b", "n"];

const PROMOTION_PIECE_LABELS: Record<PromotionPiece, string> = {
	q: "Queen",
	r: "Rook",
	b: "Bishop",
	n: "Knight",
};

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
	} catch (error) {
		console.warn("Failed to update game ID in URL", error);
	}
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

	const [promotionRequest, setPromotionRequest] = useState<PromotionRequest>(null);
	const [boardWidth, setBoardWidth] = useState(0);
	const boardResizeCleanupRef = useRef<(() => void) | null>(null);
	const boardContainerRef = useCallback((node: HTMLDivElement | null) => {
		boardResizeCleanupRef.current?.();
		boardResizeCleanupRef.current = null;

		if (!node) {
			setBoardWidth(0);
			return;
		}

		const measure = () => {
			setBoardWidth(node.getBoundingClientRect().width);
		};

		measure();

		if (typeof window === "undefined") return;
		const globalWindow = window as Window & typeof globalThis;

		if ("ResizeObserver" in globalWindow) {
			const observer = new ResizeObserver(() => measure());
			observer.observe(node);
			boardResizeCleanupRef.current = () => observer.disconnect();
			return;
		}
	}, []);

	useEffect(
		() => () => {
			boardResizeCleanupRef.current?.();
		},
		[],
	);

	// Stream state
	const { gameFull, gameState, isConnected, error: streamError, makeMove } = gameStream(gameId);

	// Uci overlay
	const [pendingUci, setPendingUci] = useState<string | null>(null);
	const { whiteMs, blackMs, activeColor, isRunning } = useGameClock({
		gameFull,
		gameState,
		pendingMove: pendingUci,
	});
	const serverMovesRef = useRef<string>("");
	const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
	const [lastMoveSquares, setLastMoveSquares] = useState<{
		from: Square | null;
		to: Square | null;
	}>({ from: null, to: null });
	const [checkSquare, setCheckSquare] = useState<Square | null>(null);

	const moveListRef = useRef<HTMLOListElement>(null);
	const prevMoveCountRef = useRef(0);

	// Canonical game status (prefers live gameState, falls back to initial gameFull.state)
	const status = gameState?.status ?? gameFull?.state?.status ?? null;
	const winner = gameState?.winner ?? gameFull?.state?.winner ?? null;

	// Flag used everywhere in UI
	const gameEnded = Boolean(status) && status !== GameStatusName.started;

	const myColor = getPlayerColor(gameFull, user);
	const boardOrientation = (myColor ?? GameColor.white) as "white" | "black";
	const playerColor = boardOrientation === GameColor.white ? "w" : "b";

	const promotionDropdown = useMemo<PromotionDropdownMetrics | null>(() => {
		if (!promotionRequest || !boardWidth) return null;
		const squareSize = boardWidth / 8;
		const coords = getRelativeCoords(boardOrientation, boardWidth, 8, 8, promotionRequest.to);
		const anchorLeft = coords.x - squareSize / 2;
		const anchorTop = coords.y - squareSize / 2;
		const dropdownHeight = squareSize * PROMOTION_PIECES.length;
		const shouldOpenDownwards = anchorTop < boardWidth / 2;
		const top = shouldOpenDownwards
			? anchorTop + squareSize
			: Math.max(anchorTop - dropdownHeight, 0);
		return {
			left: anchorLeft,
			top,
			squareSize,
			direction: shouldOpenDownwards ? "down" : "up",
		};
	}, [boardOrientation, boardWidth, promotionRequest]);

	const isPromotionMove = (source: string, target: string): boolean => {
		const board = chessRef.current;
		const piece = board.get(source as Square);
		if (!piece || piece.type !== "p") return false;

		// last rank for each color
		if (piece.color === "w" && target[1] === "8") return true;
		if (piece.color === "b" && target[1] === "1") return true;

		return false;
	};

	const sendMoveWithPromotion = async (from: string, to: string, promotion: PromotionPiece) => {
		if (!isConnected || !gameFull || !isPlayerInGame(gameFull, user)) return;

		const board = chessRef.current;

		if (board.turn() !== playerColor) return;

		try {
			const test = new Chess(board.fen());
			const move = test.move({
				from,
				to,
				promotion,
			});
			if (!move) return;

			const uci = moveToUci({ from, to, promotion: move.promotion });

			setPendingUci(uci);
			setSelectedSquare(null);

			try {
				await makeMove(uci);
			} catch (error) {
				console.error("Failed to send move:", error);
				setPendingUci(null);
				const confirmed = serverMovesRef.current ?? "";
				const rollback = new Chess();
				for (const u of confirmed.split(" ").filter(Boolean)) {
					try {
						rollback.move(uciToMove(u));
					} catch {}
				}
				setChess(rollback);
			}
		} finally {
			setPromotionRequest(null);
		}
	};

	const handlePromotionChoice = (piece: PromotionPiece) => {
		if (!promotionRequest) return;
		void sendMoveWithPromotion(promotionRequest.from, promotionRequest.to, piece);
	};

	// Rebuild chess position from confirmed + pending move
	// Rebuild chess position from confirmed + pending move
	useEffect(() => {
		if (!gameFull && !gameState) return;

		const next = new Chess();

		const confirmed = gameState?.moves ?? gameFull?.state?.moves ?? "";
		serverMovesRef.current = confirmed;

		let source = confirmed;

		if (!gameEnded && pendingUci) {
			// optimistic overlay while game is running
			const tokens = confirmed.split(" ").filter(Boolean);
			const streamHasPending = tokens.includes(pendingUci);

			if (!streamHasPending) {
				source = confirmed ? `${confirmed} ${pendingUci}` : pendingUci;
			} else {
				// server already confirmed this move
				setPendingUci(null);
			}
		} else if (gameEnded && pendingUci) {
			// game ended without confirming the pending move → drop it
			setPendingUci(null);
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
	}, [gameFull, gameState, pendingUci, gameEnded]);

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

	// Show gameID change in url
	useEffect(() => {
		setGameIdInURL(gameId);
	}, [gameId]);

	// Remove gameID from url
	useEffect(() => {
		if (gameEnded) setGameIdInURL(null);
	}, [gameEnded]);

	// Auto-scroll moves list to bottom when moves change
	useEffect(() => {
		const currentMoveCount = chess.history().length;
		if (currentMoveCount > prevMoveCountRef.current) {
			prevMoveCountRef.current = currentMoveCount;
			if (moveListRef.current) {
				// Use setTimeout to ensure DOM is updated before scrolling
				setTimeout(() => {
					if (moveListRef.current) {
						moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
					}
				}, 0);
			}
		}
	}, [chess]);

	const handleStartGame = async () => {
		setIsCreatingGame(true);
		setError(null);
		try {
			// TODO: more options
			const { gameId } = await startBotGame(selectedLevel, { limit: 300, increment: 3 });
			setPendingUci(null);
			setChess(new Chess());
			prevMoveCountRef.current = 0;
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

	const handleOfferDraw = async () => {
		if (!gameId || !isConnected || gameEnded) return;
		try {
			await offerDraw(gameId);
		} catch (e) {
			console.error("Draw offer failed:", e);
		}
	};

	const resetToLobby = () => {
		setGameId(null);
		setChess(new Chess());
		setPendingUci(null);
		serverMovesRef.current = "";
		prevMoveCountRef.current = 0;
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

	const onPieceDrop: ChessboardOptions["onPieceDrop"] = (args: PieceDropHandlerArgs): boolean => {
		const { sourceSquare, targetSquare } = args;
		if (!targetSquare) return false;
		if (!isConnected) return false;
		if (pendingUci) return false;
		if (gameEnded) return false;

		if (!isPlayerInGame(gameFull, user)) return false;

		const board = chessRef.current;
		if (board.turn() !== playerColor) return false;

		try {
			if (isPromotionMove(sourceSquare, targetSquare)) {
				const piece = board.get(sourceSquare as Square);
				if (!piece) return false;

				setPromotionRequest({
					from: sourceSquare as Square,
					to: targetSquare as Square,
					color: piece.color,
				});
				setSelectedSquare(null);
				return false;
			}

			const test = new Chess(board.fen());
			const move = test.move({
				from: sourceSquare,
				to: targetSquare,
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
					const confirmed = serverMovesRef.current ?? "";
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

	useEffect(() => {
		if (!gameEnded) return;
		setSelectedSquare(null);
		setPromotionRequest(null);
		setPendingUci(null);
	}, [gameEnded]);

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

		// King in check
		if (checkSquare) {
			tintSquare(checkSquare, "rgb(var(--color-chess-in-check) / 0.18)");
			appendShadow(checkSquare, "inset 0 0 0 2px rgb(var(--color-chess-in-check) / 0.9)");
		}

		return styles;
	}, [checkSquare, lastMoveSquares, legalMoves, selectedSquare]);

	const movesList = chess.history();

	const formatClockValue = (ms: number | null) => {
		if (ms == null) return "--:--";
		const totalSeconds = Math.max(0, Math.floor(ms / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	const moveRows = useMemo(
		() =>
			movesList.reduce(
				(rows, move, index) => {
					if (index % 2 === 0) {
						rows.push({
							moveNumber: Math.floor(index / 2) + 1,
							white: move,
							black: movesList[index + 1] ?? "",
						});
					}
					return rows;
				},
				[] as { moveNumber: number; white: string; black: string }[],
			),
		[movesList],
	);

	const playerPanels = useMemo(() => {
		return {
			white: {
				name: gameFull?.white?.name ?? "Bot",
				rating:
					gameFull?.white?.rating != null
						? `(${gameFull.white.rating})`
						: gameFull?.white?.aiLevel != null
							? `(difficulty ${gameFull.white.aiLevel})`
							: "",
			},
			black: {
				name: gameFull?.black?.name ?? "Bot",
				rating:
					gameFull?.black?.rating != null
						? `(${gameFull.black.rating})`
						: gameFull?.black?.aiLevel != null
							? `(difficulty ${gameFull.black.aiLevel})`
							: "",
			},
		};
	}, [gameFull?.black, gameFull?.white]);

	const timerOrder = useMemo(() => {
		return (myColor === GameColor.white ? ["black", "white"] : ["white", "black"]) as Array<
			"white" | "black"
		>;
	}, [myColor]);

	const renderPlayerTimer = (color: "white" | "black", position: "top" | "bottom") => {
		const player = playerPanels[color];
		const isWhite = color === "white";
		const ms = isWhite ? whiteMs : blackMs;
		const isActive = activeColor === (isWhite ? "w" : "b");
		const isLow = typeof ms === "number" && ms <= 10000; // 10 seconds
		const isCritical = typeof ms === "number" && ms <= 5000; // 5 seconds

		const timerClasses = `font-mono text-7xl ${
			isLow ? "text-[rgb(var(--color-error))]" : "text-[rgb(var(--color-fg-primary))]"
		} ${isCritical ? "animate-pulse" : ""}`;

		const containerClasses = `rounded-lg border border-[rgb(var(--color-surface-border)/0.5)] bg-[rgb(var(--color-surface-card))] p-4 text-center transition-opacity ${
			isActive ? "" : "opacity-40"
		}`;

		const timerStatus = (() => {
			if (!gameId) return "Waiting";
			if (!gameEnded && !isConnected) return "Connecting…";
			if (!isRunning && !gameEnded) return "Starting soon";
			if (gameEnded) return "Game over";
			return "Playing";
		})();

		const nameRating = (
			<div className="flex text-[rgb(var(--color-fg-primary))]">
				<div
					className={
						position === "top"
							? "bg-[rgb(var(--color-neutral-400)/0.1)] flex items-center px-2 py-1 ml-2 rounded-t-lg"
							: "bg-[rgb(var(--color-neutral-400)/0.1)] flex items-center px-2 py-1 ml-2 rounded-b-lg"
					}
				>
					<div className="text-xl font-bold truncate">{player.name}</div>
					<div className="ml-1 text-sm">{player.rating || ""}</div>
				</div>
			</div>
		);

		return (
			<div>
				{position === "top" && nameRating}
				<div key={color} className={containerClasses}>
					<div className={timerClasses}>{formatClockValue(ms)}</div>
				</div>
				{position === "bottom" && nameRating}
				<div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[rgb(var(--color-fg-secondary))]">
					{timerStatus}
				</div>
			</div>
		);
	};

	const gameActions = [
		{
			label: "Resign",
			icon: Flag,
			onClick: handleResign,
			disabled: !isConnected || gameEnded,
		},
		{
			label: "Offer draw",
			icon: Handshake,
			onClick: handleOfferDraw,
			disabled: !isConnected || gameEnded,
		},
		{
			label: "Abort",
			icon: CircleX,
			onClick: handleAbort,
			disabled: !isConnected || gameEnded,
		},
	];

	return (
		<div className="grid items-start gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2.2fr)]">
			{/* Left col: moves column + board */}
			<div className={`md:col-span-1 transition-opacity ${!gameId ? "opacity-80" : ""}`}>
				<div className="flex h-full items-stretch gap-4">
					{/* Moves column */}
					<aside
						className={`w-48 shrink-0 flex-col border border-[rgb(var(--color-surface-border)/0.8)] bg-[rgb(var(--color-surface-base))] px-3 py-3 text-xs text-[rgb(var(--color-fg-secondary))] md:flex max-h-[70vh] ${
							!gameId ? "hidden" : ""
						}`}
					>
						<div className="mb-2 text-[14px] font-semibold uppercase tracking-[0.25em] text-[rgb(var(--color-fg-secondary))]">
							Moves
						</div>
						<div className="flex items-center justify-between pb-1 text-[12px] uppercase tracking-[0.18em] text-[rgb(var(--color-fg-secondary))]">
							<span className="w-6">#</span>
							<span className="flex-1 text-center">White</span>
							<span className="flex-1 text-center">Black</span>
						</div>
						<ol
							className="mt-1 flex-1 space-y-px overflow-y-auto pr-1 text-[14px] scroll-smooth"
							ref={moveListRef}
						>
							{moveRows.map((row, index) => (
								<li
									key={row.moveNumber}
									className={`flex items-center justify-between gap-2 px-1 py-0.5 ${
										index === moveRows.length - 1
											? "bg-[rgb(var(--color-surface-card))]"
											: "hover:bg-[rgb(var(--color-surface-card)/0.7)]"
									}`}
								>
									<span className="w-6 text-[rgb(var(--color-fg-secondary))]">
										{row.moveNumber}.
									</span>
									<span className="flex-1 truncate text-[rgb(var(--color-fg-primary))]">
										{row.white}
									</span>
									<span className="flex-1 truncate text-left text-[rgb(var(--color-fg-primary))]">
										{row.black}
									</span>
								</li>
							))}
						</ol>
					</aside>

					{/* Board */}
					<div className="flex-1">
						<div className="aspect-square w-full max-w-full border border-[rgb(var(--color-surface-border)/0.8)] bg-[rgb(var(--color-surface-base))] p-2">
							<div className="size-full relative" ref={boardContainerRef}>
								<Chessboard
									options={{
										position: chess.fen(),
										boardOrientation,
										onPieceDrop,
										onSquareClick: handleSquareClick,
										onPieceClick: handlePieceClick,
										onPieceDrag: handlePieceDrag,
										canDragPiece,
										squareStyles,
									}}
								/>

								{/* 🔹 Promotion picker overlay */}
								{promotionRequest && promotionDropdown && (
									<>
										<button
											type="button"
											aria-label="Cancel pawn promotion"
											onClick={() => setPromotionRequest(null)}
											onContextMenu={(event) => {
												event.preventDefault();
												setPromotionRequest(null);
											}}
											className="absolute inset-0 z-30 cursor-default bg-black/30 p-0"
										/>
										<div
											className="absolute z-40 flex overflow-hidden rounded-md border border-[rgb(var(--color-surface-border))] bg-[rgb(var(--color-surface-card))] shadow-lg"
											style={{
												left: promotionDropdown.left,
												top: promotionDropdown.top,
												width: promotionDropdown.squareSize,
												flexDirection:
													promotionDropdown.direction === "down" ? "column" : "column-reverse",
											}}
										>
											{PROMOTION_PIECES.map((piece) => {
												const pieceKey =
													`${promotionRequest.color}${piece.toUpperCase()}` as keyof PieceRenderObject;
												const PieceIcon = defaultPieces[pieceKey];
												return (
													<button
														key={piece}
														type="button"
														onClick={() => handlePromotionChoice(piece)}
														onContextMenu={(event) => event.preventDefault()}
														className="flex aspect-square w-full items-center justify-center bg-transparent p-0 text-lg text-[rgb(var(--color-fg-primary))] hover:bg-[rgb(var(--color-neutral-400)/0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary-500))]"
													>
														{PieceIcon?.()}
														<span className="sr-only">{PROMOTION_PIECE_LABELS[piece]}</span>
													</button>
												);
											})}
										</div>
									</>
								)}
							</div>
						</div>
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
								<label
									htmlFor="level"
									className="block text-sm text-[rgb(var(--color-fg-secondary))]"
								>
									Bot strength (1-8)
								</label>
								<input
									id="level"
									type="range"
									min="1"
									max="8"
									value={selectedLevel}
									onChange={(e) => setSelectedLevel(Number(e.target.value))}
									className="w-full h-2 rounded-lg bg-[rgb(var(--color-surface-card))] appearance-none cursor-pointer"
								/>
								<div className="mt-1 text-sm">Level {selectedLevel}</div>
							</div>

							{error && (
								<div
									className="rounded bg-[rgb(var(--color-error)/0.1)] p-4 text-sm text-[rgb(var(--color-error))]"
									role="alert"
								>
									Error: {error}
								</div>
							)}

							<button
								type="button"
								onClick={handleStartGame}
								disabled={isCreatingGame}
								className="rounded bg-[rgb(var(--color-secondary-500))] px-6 py-2 text-white hover:bg-[rgb(var(--color-secondary-700))]"
							>
								{isCreatingGame ? " Creating game..." : "Start Game"}
							</button>
						</div>
					</div>
				) : (
					<div>
						<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
							<div className="flex-1 space-y-3">
								{timerOrder.map((color, index) =>
									renderPlayerTimer(color, index === 0 ? "top" : "bottom"),
								)}
							</div>
							{/* Game Actions */}
							<div className="flex flex-col gap-1 self-center">
								{gameActions.map(({ label, icon: Icon, onClick, disabled }) => (
									<button
										key={label}
										type="button"
										onClick={onClick}
										disabled={disabled}
										aria-label={label}
										title={label}
										className={`
											inline-flex items-center justify-center p-2 
											rounded-full transition 
											disabled:opacity-40 disabled:cursor-not-allowed 
											text-gray-500 hover:bg-[rgb(var(--color-surface-border)/0.1)] hover:text-[rgb(var(--color-fg-primary))]
											${disabled ? "hover:bg-transparent hover:text-gray-500" : ""}`}
									>
										<Icon className="h-6 w-6" aria-hidden />
									</button>
								))}
							</div>
						</div>

						{gameEnded && (
							<div className="mb-6 flex flex-col gap-2 sm:flex-row">
								<button
									type="button"
									onClick={resetToLobby}
									className="rounded-lg bg-[rgb(var(--color-surface-nav))] px-4 py-2 text-sm font-medium text-[rgb(var(--color-fg-primary))] transition hover:bg-[rgb(var(--color-surface-border))] disabled:opacity-50"
								>
									New Game
								</button>
								<button
									type="button"
									onClick={handleStartGame}
									disabled={isCreatingGame}
									className="rounded-lg bg-[rgb(var(--color-secondary-500))] px-4 py-2 text-sm font-medium text-[rgb(var(--color-fg-on-primary))] transition hover:bg-[rgb(var(--color-secondary-700))] disabled:opacity-50"
								>
									{isCreatingGame ? "Starting…" : "Rematch"}
								</button>
							</div>
						)}
						<div className="grid grid-cols-2 flex items-center mb-4">
							<h2 className="text-xl font-bold">Playing vs Bot</h2>
							<div className="text-sm text-[rgb(var(--color-fg-secondary))] justify-end flex mr-4">
								{gameEnded ? null : isConnected ? (
									<span className="text-[rgb(var(--color-success))]" title="Connected">
										Connected
									</span>
								) : (
									<span className="text-[rgb(var(--color-warning))]" title="Connecting">
										Connecting...
									</span>
								)}
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
					</div>
				)}
			</div>
		</div>
	);
}
