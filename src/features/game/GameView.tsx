import { Chess, type Move as ChessMove, type Square, type Color } from "chess.js";
import { CircleX, Flag, Handshake } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Chessboard,
	type ChessboardOptions,
	defaultPieces,
	getRelativeCoords,
	type PieceDropHandlerArgs,
	type PieceRenderObject,
} from "react-chessboard";
import { GameColor } from "../../generated/types/gameColor";
import { GameStatusName } from "../../generated/types/gameStatusName";
import { getPlayerColor, isPlayerInGame, moveToUci, uciToMove } from "../../libs/game";
import {
	type UiBoard,
	type UiGhostPiece,
	type UiPiece,
	type UiPieceKey,
	type UiPremove,
	type UiPromotionDropdownMetrics,
	type UiPromotionPiece,
	type UiPromotionRequest,
	applyPremoves,
	boardFromChess,
	boardToChessboardPosition,
	findKingSquare,
	formatClockTime,
	isFeasiblePremove,
	keyToPiece,
	pieceToKey,
} from "../../libs/game";
import { getGameIdFromURL, setGameIdInURL } from "../../libs/url";
import { useAuth } from "../auth/AuthProvider";
import { abortGame, offerDraw, resignGame, startBotGame } from "./gameActions";
import { useGameClock } from "./gameClock";
import { GameModeTabs } from "./GameModeTabs";
import { gameStream } from "./gameStream";
import type { UiBotLevel, UiColorChoice } from "../../libs/gameSetup";

export default function GameView() {
	const { user } = useAuth();

	const [gameId, setGameId] = useState<string | null>(() => getGameIdFromURL());
	const [chess, setChess] = useState(new Chess());
	const chessRef = useRef(chess);
	const [isCreatingGame, setIsCreatingGame] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [promotionRequest, setPromotionRequest] = useState<UiPromotionRequest>(null);

	// Local promotion order and labels (kept in UI to allow flexible presentation)
	const promotionOrder: UiPromotionPiece[] = ["q", "r", "b", "n"];
	const promotionLabel = (p: UiPromotionPiece) => {
		switch (p) {
			case "q":
				return "Queen";
			case "r":
				return "Rook";
			case "b":
				return "Bishop";
			case "n":
				return "Knight";
		}
	};
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
	const [premoveQueue, setPremoveQueue] = useState<UiPremove[]>([]);
	const [pendingIsPremove, setPendingIsPremove] = useState(false);
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

	const isMyGame = Boolean(gameFull && isPlayerInGame(gameFull, user));

	const canPlayMove = () =>
		isConnected &&
		!gameEnded &&
		isMyGame &&
		pendingUci == null &&
		chessRef.current.turn() === playerColor;

	const canQueuePremove = () =>
		isConnected && !gameEnded && isMyGame && chessRef.current.turn() !== playerColor;

	const promotionDropdown = useMemo<UiPromotionDropdownMetrics | null>(() => {
		if (!promotionRequest || !boardWidth) return null;
		const squareSize = boardWidth / 8;
		const coords = getRelativeCoords(boardOrientation, boardWidth, 8, 8, promotionRequest.to);
		const anchorLeft = coords.x - squareSize / 2;
		const anchorTop = coords.y - squareSize / 2;
		const dropdownHeight = squareSize * promotionOrder.length;
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

	const sendMoveWithPromotion = async (from: string, to: string, promotion: UiPromotionPiece) => {
		if (!canPlayMove()) return;

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
			setPendingIsPremove(false);
			setSelectedSquare(null);

			try {
				await makeMove(uci);
			} catch (error) {
				console.error("Failed to send move:", error);
				setPendingUci(null);
				setPendingIsPremove(false);
				setPremoveQueue([]);
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

	const handlePromotionChoice = (piece: UiPromotionPiece) => {
		if (!promotionRequest) return;

		if (promotionRequest.mode === "live") {
			void sendMoveWithPromotion(promotionRequest.from, promotionRequest.to, piece);
			return;
		}

		// Premove promotion
		const { from, to } = promotionRequest;
		const uci = moveToUci({
			from,
			to,
			promotion: piece,
		});

		setPremoveQueue((prev) => [
			...prev,
			{
				uci,
				from,
				to,
				promotion: piece,
			},
		]);

		setSelectedSquare(null);
		setPromotionRequest(null);
	};

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
				setPendingIsPremove(false);
			}
		} else if (gameEnded && pendingUci) {
			// game ended without confirming the pending move → drop it
			setPendingUci(null);
			setPendingIsPremove(false);
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

	// Keep ref in sync, and update check highlight / selection validity
	useEffect(() => {
		chessRef.current = chess;

		if (selectedSquare) {
			const piece = chess.get(selectedSquare);
			if (!piece || piece.color !== playerColor) {
				setSelectedSquare(null);
			}
		}

		if (chess.isCheck()) {
			const uiBoard = boardFromChess(chess);
			setCheckSquare(findKingSquare(uiBoard, chess.turn()) ?? null);
		} else {
			setCheckSquare(null);
		}
	}, [chess, playerColor, selectedSquare]);

	// Send premoves when it becomes our turn according to the server state
	useEffect(() => {
		if (!gameFull || !gameState) return;
		if (!isMyGame) return;
		if (!isConnected) return;
		if (gameEnded) return;
		if (!premoveQueue.length) return;
		if (pendingUci) return;

		const latestState = gameState ?? gameFull.state;
		if (!latestState) return;

		const movesStr = latestState.moves ?? "";
		const moveTokens = movesStr.trim() ? movesStr.trim().split(/\s+/).filter(Boolean) : [];
		const moveCount = moveTokens.length;
		const serverTurn: Color = moveCount % 2 === 0 ? "w" : "b";

		if (serverTurn !== playerColor) return;

		const [next, ...rest] = premoveQueue;

		// Rebuild server board (confirmed only) to validate premove
		const serverBoard = new Chess();
		for (const uci of moveTokens) {
			try {
				serverBoard.move(uciToMove(uci));
			} catch (error) {
				console.error("Failed to apply server move while processing premove:", uci, error);
				return;
			}
		}

		let legal = false;
		try {
			const candidate = uciToMove(next.uci);
			const test = new Chess(serverBoard.fen());
			const result = test.move(candidate);
			legal = Boolean(result);
		} catch {
			legal = false;
		}

		if (!legal) {
			// Premove is no longer legal on the actual board
			setPremoveQueue([]);
			setSelectedSquare(null);
			return;
		}

		// Send the premove as a normal move
		setPendingUci(next.uci);
		setPendingIsPremove(true);
		setPremoveQueue(rest);
		setSelectedSquare(null);

		(async () => {
			try {
				await makeMove(next.uci);
			} catch (error) {
				console.error("Failed to send premove:", error);
				setPendingUci(null);
				setPendingIsPremove(false);
				setPremoveQueue([]);
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
	}, [
		gameFull,
		gameState,
		isMyGame,
		isConnected,
		gameEnded,
		premoveQueue,
		pendingUci,
		playerColor,
		makeMove,
	]);

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

	// Build board position = server + pending board + local premove overlay
	const { boardPosition, ghostPieces } = useMemo(() => {
		// Get base board from chess.js
		const baseBoard = boardFromChess(chess);

		// Apply premoves visually
		let visualBoard: UiBoard;
		let ghosts: UiGhostPiece[] = [];

		if (premoveQueue.length > 0) {
			const result = applyPremoves(baseBoard, premoveQueue);
			visualBoard = result.board;
			ghosts = result.ghosts;
		} else {
			visualBoard = { ...baseBoard };
		}

		// Apply visual overlay for a pending premove promotion request
		if (promotionRequest && promotionRequest.mode === "premove") {
			const { from, to } = promotionRequest;
			const piece = visualBoard[from];
			if (piece) {
				// Move the pawn visually to the target
				visualBoard[to] = piece;
				delete visualBoard[from];
				// Add ghost at original position
				ghosts.push({ square: from, piece });
			}
		}

		// Convert to react-chessboard format
		const pos = boardToChessboardPosition(visualBoard);

		if (!premoveQueue.length && !(promotionRequest && promotionRequest.mode === "premove")) {
			return { boardPosition: pos, ghostPieces: [] as UiGhostPiece[] };
		}

		return { boardPosition: pos, ghostPieces: ghosts };
	}, [chess, premoveQueue, promotionRequest]);

	const getVisualPieceAt = useCallback(
		(square: Square): UiPiece | null => {
			const entry = boardPosition[square];
			if (!entry) return null;

			return keyToPiece(entry.pieceType as UiPieceKey);
		},
		[boardPosition],
	);

	const handleStartBotGame = async (config: {
		level: UiBotLevel;
		clock: { limit: number; increment: number } | null;
		color: UiColorChoice;
	}) => {
		setIsCreatingGame(true);
		setError(null);
		try {
			const { gameId } = await startBotGame(config.level, config.clock, config.color);
			setPendingUci(null);
			setPendingIsPremove(false);
			setPremoveQueue([]);
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
		setPendingIsPremove(false);
		setPremoveQueue([]);
		setSelectedSquare(null);
		setLastMoveSquares({ from: null, to: null });
		setCheckSquare(null);
		setPromotionRequest(null);
		serverMovesRef.current = "";
		prevMoveCountRef.current = 0;
	};

	const ownsSquare = (square: Square) => {
		const piece = getVisualPieceAt(square);
		if (!piece) return false;
		return piece.color === playerColor;
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

	const handleBoardClick = (square: string | null | undefined) => {
		if (!square) return;
		if (!isMyGame || gameEnded) return;

		const targetSquare = square as Square;

		if (!selectedSquare) {
			handleSelectSquare(targetSquare);
			return;
		}

		if (targetSquare === selectedSquare || ownsSquare(targetSquare)) {
			handleSelectSquare(targetSquare);
			return;
		}

		// We have a selected source and clicked a different square
		const sourceSquare = selectedSquare;
		const isMyTurn = canPlayMove();
		const board = chessRef.current;

		if (!isMyTurn) {
			setSelectedSquare(null);
			return;
		}

		// Real move path
		try {
			if (isPromotionMove(sourceSquare, targetSquare)) {
				const piece = board.get(sourceSquare as Square);
				if (!piece) {
					setSelectedSquare(null);
					return;
				}

				setPromotionRequest({
					from: sourceSquare,
					to: targetSquare,
					color: piece.color,
					mode: "live",
				});
				setSelectedSquare(null);
				return;
			}

			const test = new Chess(board.fen());
			const move = test.move({
				from: sourceSquare,
				to: targetSquare,
			});
			if (!move) return;

			const uci = moveToUci({
				from: sourceSquare,
				to: targetSquare,
				promotion: move.promotion,
			});

			setPendingUci(uci);
			setPendingIsPremove(false);
			setSelectedSquare(null);

			(async () => {
				try {
					await makeMove(uci);
				} catch (error) {
					console.error("Failed to send move:", error);
					setPendingUci(null);
					setPendingIsPremove(false);
					setPremoveQueue([]);
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
		} catch {}
	};

	const handleSquareClick: ChessboardOptions["onSquareClick"] = ({ square }) =>
		handleBoardClick(square);

	const handlePieceClick: ChessboardOptions["onPieceClick"] = ({ square }) =>
		handleBoardClick(square);

	const handlePieceDrag: ChessboardOptions["onPieceDrag"] = ({ square }) => {
		if (!square) return;
		if (!isMyGame || gameEnded) return;
		const next = square as Square;
		if (!ownsSquare(next)) return;
		if (selectedSquare !== next) {
			setSelectedSquare(next);
		}
	};

	const canDragPiece: ChessboardOptions["canDragPiece"] = ({ square }) => {
		if (!square) return false;
		if (!isMyGame || gameEnded) return false;
		return ownsSquare(square as Square);
	};

	const onPieceDrop: ChessboardOptions["onPieceDrop"] = (args: PieceDropHandlerArgs): boolean => {
		const { sourceSquare, targetSquare } = args;
		if (!targetSquare) return false;
		if (!isMyGame || gameEnded) return false;

		const isMyTurn = canPlayMove();
		const canPremoveNow = !isMyTurn && canQueuePremove();

		const board = chessRef.current;

		// Real move path
		if (isMyTurn) {
			try {
				if (isPromotionMove(sourceSquare, targetSquare)) {
					const piece = board.get(sourceSquare as Square);
					if (!piece) return false;

					setPromotionRequest({
						from: sourceSquare as Square,
						to: targetSquare as Square,
						color: piece.color,
						mode: "live",
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

				const uci = moveToUci({
					from: sourceSquare,
					to: targetSquare,
					promotion: move.promotion,
				});
				setPendingUci(uci);
				setPendingIsPremove(false);
				setSelectedSquare(null);

				(async () => {
					try {
						await makeMove(uci);
					} catch (error) {
						console.error("Failed to send move:", error);
						setPendingUci(null);
						setPendingIsPremove(false);
						setPremoveQueue([]);
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
		}

		// Premove path
		if (canPremoveNow) {
			const visualPiece = getVisualPieceAt(sourceSquare as Square);
			if (!visualPiece || visualPiece.color !== playerColor) return false;

			if (!isFeasiblePremove(visualPiece, sourceSquare as Square, targetSquare as Square)) {
				return false;
			}

			const isPremovablePromotion =
				visualPiece.type === "p" &&
				((visualPiece.color === "w" && targetSquare[1] === "8") ||
					(visualPiece.color === "b" && targetSquare[1] === "1"));

			if (isPremovablePromotion) {
				setPromotionRequest({
					from: sourceSquare as Square,
					to: targetSquare as Square,
					color: visualPiece.color,
					mode: "premove",
				});
				setSelectedSquare(null);
				return true;
			}
			const uci = moveToUci({
				from: sourceSquare,
				to: targetSquare,
			});

			setPremoveQueue((prev) => [
				...prev,
				{
					uci,
					from: sourceSquare as Square,
					to: targetSquare as Square,
				},
			]);
			setSelectedSquare(null);
			return true;
		}

		return false;
	};

	useEffect(() => {
		if (!gameEnded) return;
		setSelectedSquare(null);
		setPromotionRequest(null);
		setPendingUci(null);
		setPendingIsPremove(false);
		setPremoveQueue([]);
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
				const fileIndex = target.charCodeAt(0) - "a".charCodeAt(0); // 0..7
				const rankIndex = parseInt(target[1], 10) - 1; // 0..7
				const isLightSquare = (fileIndex + rankIndex) % 2 === 1; // a1 is dark so odd = light

				if (isLightSquare) {
					styles[target] = {
						...styles[target],
						backgroundImage: `
							radial-gradient(circle,
								rgb(var(--color-primary-900) / 0.8) 0,
								rgb(var(--color-primary-900) / 0.8) 30%,
								transparent 35%
							)`,
						backgroundRepeat: "no-repeat",
						backgroundPosition: "center",
						backgroundSize: "40% 40%",
					};
				} else {
					styles[target] = {
						...styles[target],
						backgroundImage: `
							radial-gradient(circle,
								rgb(var(--color-chess-move-legal-dot) / 0.5) 0,
								rgb(var(--color-chess-move-legal-dot) / 0.5) 30%,
								transparent 35%
							)`,
						backgroundRepeat: "no-repeat",
						backgroundPosition: "center",
						backgroundSize: "40% 40%",
					};
				}
			}
		}

		// King in check
		if (checkSquare) {
			tintSquare(checkSquare, "rgb(var(--color-chess-in-check) / 0.18)");
			appendShadow(checkSquare, "inset 0 0 0 2px rgb(var(--color-chess-in-check) / 0.9)");
		}

		// Premove path highlight
		for (const step of premoveQueue) {
			tintSquare(step.from, "rgb(var(--color-primary-400) / 0.12)");
			tintSquare(step.to, "rgb(var(--color-primary-400) / 0.28)");
		}

		return styles;
	}, [checkSquare, lastMoveSquares, legalMoves, selectedSquare, premoveQueue]);

	const showBoardAnimations = !premoveQueue.length && !pendingIsPremove;

	const movesList = chess.history();
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

		// Detect unlimited game (no clock on gameFull)
		const isUnlimited = !gameFull?.clock;

		const timerClasses = `font-mono text-7xl ${
			isUnlimited
				? "text-[rgb(var(--color-surface-card))]"
				: isLow
					? "text-[rgb(var(--color-error))]"
					: "text-[rgb(var(--color-fg-primary))]"
		} ${isCritical && !isUnlimited ? "animate-pulse" : ""}`;

		const containerClasses = `rounded-lg border border-[rgb(var(--color-surface-border)/0.5)] bg-[rgb(var(--color-surface-card))] p-4 text-center transition-opacity ${
			isActive ? "" : "opacity-40"
		}`;

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
					<div className={timerClasses}>{formatClockTime(ms)}</div>
				</div>
				{position === "bottom" && nameRating}
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
										position: boardPosition,
										boardOrientation,
										onPieceDrop,
										onSquareClick: handleSquareClick,
										onPieceClick: handlePieceClick,
										onPieceDrag: handlePieceDrag,
										canDragPiece,
										squareStyles,
										showAnimations: showBoardAnimations,
										animationDurationInMs: 150,
										arrowOptions: {
											color: "rgb(var(--color-chess-move-premove) / 0.9)",
											secondaryColor: "rgb(var(--color-chess-move-last) / 0.9)",
											tertiaryColor: "rgb(var(--color-chess-move-last) / 0.9)",
											arrowLengthReducerDenominator: 3,
											sameTargetArrowLengthReducerDenominator: 4,
											arrowWidthDenominator: 6,
											activeArrowWidthMultiplier: 0.9,
											opacity: 0.6,
											activeOpacity: 0.5,
										},
										lightSquareStyle: { backgroundColor: "rgb(var(--color-chess-light-square))" },
										darkSquareStyle: { backgroundColor: "rgb(var(--color-chess-dark-square))" },
									}}
								/>

								{/* Ghost overlay - actual pieces in low opacity during premoves */}
								{ghostPieces.map((ghost) => {
									if (!boardWidth) return null;

									const squareSize = boardWidth / 8;
									const coords = getRelativeCoords(
										boardOrientation,
										boardWidth,
										8,
										8,
										ghost.square,
									);

									const pieceKey = pieceToKey(ghost.piece) as keyof PieceRenderObject;
									const PieceIcon = defaultPieces[pieceKey];
									if (!PieceIcon) return null;
									return (
										<div
											key={`ghost-${ghost.square}`}
											className="absolute pointer-events-none"
											style={{
												left: coords.x - squareSize / 2,
												top: coords.y - squareSize / 2,
												width: squareSize,
												height: squareSize,
												opacity: 0.3,
											}}
										>
											<PieceIcon />
										</div>
									);
								})}

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
											{promotionOrder.map((piece) => {
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
														<span className="sr-only">{promotionLabel(piece)}</span>
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
					<GameModeTabs
						isCreating={isCreatingGame}
						error={error}
						onStartBotGame={handleStartBotGame}
					/>
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
