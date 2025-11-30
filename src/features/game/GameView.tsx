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
import { Chess, type Move as ChessMove, type Square, type Color, type PieceSymbol } from "chess.js";
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
	mode: "live" | "premove";
} | null;

type PromotionDropdownMetrics = {
	left: number;
	top: number;
	squareSize: number;
	direction: "down" | "up";
};

type PremoveStep = {
	uci: string;
	from: Square;
	to: Square;
	promotion?: PromotionPiece;
};

type BoardPosition = {
	[square: string]: { pieceType: string };
};

type VisualPiece = {
	color: Color;
	type: PieceSymbol;
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

	type GhostPiece = {
		square: Square;
		pieceType: string;
	};

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
	const [premoveQueue, setPremoveQueue] = useState<PremoveStep[]>([]);
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

	const handlePromotionChoice = (piece: PromotionPiece) => {
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
			setCheckSquare(findKingSquare(chess, chess.turn()) ?? null);
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
		const serverTurn: "w" | "b" = moveCount % 2 === 0 ? "w" : "b";

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
		const basePos: BoardPosition = {};
		const matrix = chess.board();

		// Base from chess.js (confirmed + pending)
		for (let rank = 0; rank < matrix.length; rank += 1) {
			for (let file = 0; file < matrix[rank].length; file += 1) {
				const piece = matrix[rank][file];
				if (!piece) continue;

				const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
				const rankChar = (8 - rank).toString();
				const square = `${fileChar}${rankChar}` as Square;

				const colorPrefix = piece.color;
				const typeLetter = piece.type.toUpperCase();

				basePos[square] = { pieceType: `${colorPrefix}${typeLetter}` };
			}
		}

		// Start visual position as a copy of base (actual) board
		const pos: BoardPosition = { ...basePos };

		// Apply premoves on top (ignore turn rules)
		for (const step of premoveQueue) {
			const from = step.from;
			const to = step.to;
			const piece = pos[from];
			if (!piece) {
				continue;
			}

			const existingType = piece.pieceType;
			const colorPrefix = existingType[0];
			const baseType = existingType[1];
			const finalType = step.promotion ? step.promotion.toUpperCase() : baseType;

			delete pos[from];
			pos[to] = { pieceType: `${colorPrefix}${finalType}` };
		}

		// Apply visual overlay for a pending premove promotion request
		if (promotionRequest && promotionRequest.mode === "premove") {
			const { from, to } = promotionRequest;
			const piece = pos[from];
			if (piece) {
				// Move the pawn visually to the target
				pos[to] = piece;
				delete pos[from];
			}
		}

		const ghosts: GhostPiece[] = [];
		// We only need ghosts where something moved
		for (const [square, basePiece] of Object.entries(basePos)) {
			const visualPiece = pos[square];
			if (!visualPiece || visualPiece.pieceType !== basePiece.pieceType) {
				ghosts.push({
					square: square as Square,
					pieceType: basePiece.pieceType,
				});
			}
		}

		if (!premoveQueue.length && !(promotionRequest && promotionRequest.mode === "premove")) {
			return { boardPosition: pos, ghostPieces: [] as GhostPiece[] };
		}

		return { boardPosition: pos, ghostPieces: ghosts };
	}, [chess, premoveQueue, promotionRequest]);

	const getVisualPieceAt = useCallback(
		(square: Square): VisualPiece | null => {
			const entry = boardPosition[square];
			if (!entry) return null;

			const color = entry.pieceType[0] as Color;
			const type = entry.pieceType[1].toLowerCase() as PieceSymbol;

			return { color, type };
		},
		[boardPosition],
	);

	const isFeasiblePremove = (piece: VisualPiece, from: string, to: string): boolean => {
		if (from.length !== 2 || to.length !== 2) return false;

		const fileFrom = from.charCodeAt(0) - "a".charCodeAt(0); // 0..7
		const rankFrom = parseInt(from[1], 10) - 1; // 0..7

		const fileTo = to.charCodeAt(0) - "a".charCodeAt(0);
		const rankTo = parseInt(to[1], 10) - 1;

		if (
			fileFrom < 0 ||
			fileFrom > 7 ||
			fileTo < 0 ||
			fileTo > 7 ||
			rankFrom < 0 ||
			rankFrom > 7 ||
			rankTo < 0 ||
			rankTo > 7
		) {
			return false;
		}

		const dx = fileTo - fileFrom;
		const dy = rankTo - rankFrom;

		if (dx === 0 && dy === 0) return false;

		switch (piece.type) {
			case "p": {
				const forward = piece.color === "w" ? 1 : -1;
				const startRank = piece.color === "w" ? 1 : 6; // ranks 2 and 7

				// Single push
				if (dx === 0 && dy === forward) return true;

				// Double push from starting rank
				if (dx === 0 && dy === 2 * forward && rankFrom === startRank) return true;

				// Diagonal capture
				if (Math.abs(dx) === 1 && dy === forward) return true;

				return false;
			}
			case "n": {
				const adx = Math.abs(dx);
				const ady = Math.abs(dy);
				return (adx === 1 && ady === 2) || (adx === 2 && ady === 1);
			}
			case "b":
				return Math.abs(dx) === Math.abs(dy);
			case "r":
				return (dx === 0 && dy !== 0) || (dy === 0 && dx !== 0);
			case "q":
				return (dx === 0 && dy !== 0) || (dy === 0 && dx !== 0) || Math.abs(dx) === Math.abs(dy);
			case "k":
				return Math.max(Math.abs(dx), Math.abs(dy)) === 1;
			default:
				return false;
		}
	};

	const handleStartGame = async () => {
		setIsCreatingGame(true);
		setError(null);
		try {
			// TODO: more options
			const { gameId } = await startBotGame(selectedLevel, { limit: 300, increment: 3 });
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
		const next = square as Square;
		if (ownsSquare(next)) {
			handleSelectSquare(next);
		} else {
			setSelectedSquare(null);
		}
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

			if (!isFeasiblePremove(visualPiece, sourceSquare, targetSquare)) {
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

	const formatClockValue = (ms: number | null) => {
		if (ms == null) return "--:--";
		const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
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

			if (status && status !== GameStatusName.started) {
				return "Game over";
			}

			if (!isConnected) return "Connecting…";
			if (!isRunning) return "Starting soon";
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

									const pieceKey = ghost.pieceType as keyof PieceRenderObject;
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
