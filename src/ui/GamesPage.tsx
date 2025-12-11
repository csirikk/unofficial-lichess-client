import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";
import { apiAccountPlaying, apiGamesUser } from "../generated/client/games";
import type { ApiAccountPlaying200NowPlayingItem } from "../generated/types/apiAccountPlaying200NowPlayingItem";
import type { GameJson } from "../generated/types/gameJson";
import { createAuthHeaders, createStreamHeaders } from "../lib/api";
import { readNdjsonStream } from "../lib/stream";
import { formatSpeed } from "../features/game/model/game-info-helpers";
import { formatClockTime } from "../features/game/model/chess";
import Layout from "./Layout";

type OngoingGame = ApiAccountPlaying200NowPlayingItem;

export default function GamesPage() {
	const { user } = useAuth();
	const [ongoingGames, setOngoingGames] = useState<OngoingGame[]>([]);
	const [recentGames, setRecentGames] = useState<GameJson[]>([]);
	const [isLoadingOngoing, setIsLoadingOngoing] = useState(true);
	const [isLoadingHistory, setIsLoadingHistory] = useState(true);

	useEffect(() => {
		if (!user) return;

		// Fetch ongoing games
		const fetchOngoing = async () => {
			try {
				setIsLoadingOngoing(true);
				const response = await apiAccountPlaying(undefined, createAuthHeaders());
				if (response.status === 200) {
					setOngoingGames(response.data.nowPlaying || []);
				}
			} catch (error) {
				console.error("Failed to fetch ongoing games:", error);
			} finally {
				setIsLoadingOngoing(false);
			}
		};

		// Fetch recent games
		const fetchHistory = async () => {
			try {
				setIsLoadingHistory(true);
				const games: GameJson[] = [];
				const response = await apiGamesUser(user.username, { max: 20 }, createStreamHeaders());

				if (response.status === 200 && "stream" in response) {
					const stream = readNdjsonStream<GameJson>("game-history", response.stream, (game) =>
						games.push(game),
					);

					await stream.closePromise;
					setRecentGames(games);
				}
			} catch (error) {
				console.error("Failed to fetch game history:", error);
			} finally {
				setIsLoadingHistory(false);
			}
		};

		fetchOngoing();
		fetchHistory();
	}, [user]);

	if (!user) {
		return (
			<Layout>
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-lg text-[rgb(var(--color-fg-secondary))]">
						Please sign in to view your games
					</p>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
				{/* Ongoing Games Section */}
				{ongoingGames.length > 0 && (
					<section>
						<h2 className="mb-4 text-2xl font-bold text-[rgb(var(--color-fg-primary))]">
							Ongoing Games
						</h2>
						{isLoadingOngoing ? (
							<p className="text-sm text-[rgb(var(--color-fg-secondary))]">Loading…</p>
						) : (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{ongoingGames.map((game) => (
									<GameCard key={game.gameId} game={game} type="ongoing" />
								))}
							</div>
						)}
					</section>
				)}

				{/* Recent Games Section */}
				<section>
					<h2 className="mb-4 text-2xl font-bold text-[rgb(var(--color-fg-primary))]">
						Game History
					</h2>
					{isLoadingHistory ? (
						<p className="text-sm text-[rgb(var(--color-fg-secondary))]">Loading…</p>
					) : recentGames.length === 0 ? (
						<p className="text-sm text-[rgb(var(--color-fg-secondary))]">No games found</p>
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{recentGames.map((game) => (
								<GameCard key={game.id} game={game} type="history" />
							))}
						</div>
					)}
				</section>
			</div>
		</Layout>
	);
}

function GameCard({ game, type }: { game: OngoingGame | GameJson; type: "ongoing" | "history" }) {
	const isOngoing = type === "ongoing";

	if (isOngoing) {
		const ongoingGame = game as OngoingGame;
		const opponentName = ongoingGame.opponent.username || "Anonymous";
		const isMyTurn = ongoingGame.isMyTurn;
		const timeLeftMs = ongoingGame.secondsLeft * 1000;
		const timeDisplay = formatClockTime(timeLeftMs);
		const speedLabel = formatSpeed(ongoingGame.speed);

		return (
			<Link
				to={`/?game=${ongoingGame.fullId}`}
				className="group block rounded-lg border border-[rgb(var(--color-surface-border))] bg-[rgb(var(--color-surface-card))] p-4 transition-all hover:border-[rgb(var(--color-primary-500))] hover:shadow-lg"
			>
				<div className="mb-3 flex items-center justify-between">
					<span
						className={`text-xs font-semibold uppercase ${isMyTurn ? "text-[rgb(var(--color-primary-500))]" : "text-[rgb(var(--color-fg-secondary))]"}`}
					>
						{isMyTurn ? "Your turn" : "Opponent's turn"}
					</span>
					<span className="text-xs text-[rgb(var(--color-fg-secondary))]">
						{speedLabel} • {ongoingGame.rated ? "Rated" : "Casual"}
					</span>
				</div>
				<div className="mb-2 text-base font-semibold text-[rgb(var(--color-fg-primary))] truncate">
					vs {opponentName}
				</div>
				<div className="text-sm text-[rgb(var(--color-fg-secondary))]">
					{ongoingGame.secondsLeft > 0 && <span>{timeDisplay} left</span>}
				</div>
			</Link>
		);
	}

	const historyGame = game as GameJson;
	const players = historyGame.players;
	const white = players?.white;
	const black = players?.black;
	const status = historyGame.status;
	const winner = historyGame.winner;

	// Handle AI opponents
	const whiteName = white?.aiLevel
		? `AI Level ${white.aiLevel}`
		: white?.user?.name || white?.name || "Anonymous";
	const blackName = black?.aiLevel
		? `AI Level ${black.aiLevel}`
		: black?.user?.name || black?.name || "Anonymous";

	const whiteRating = white?.rating;
	const blackRating = black?.rating;

	const isWhiteWinner = winner === "white";
	const isBlackWinner = winner === "black";
	const isDraw = !winner;

	const speedLabel = formatSpeed(historyGame.speed);
	const createdAt = historyGame.createdAt
		? new Date(historyGame.createdAt).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: "";

	return (
		<Link
			to={`/?game=${historyGame.id}`}
			className="group block rounded-lg border border-[rgb(var(--color-surface-border))] bg-[rgb(var(--color-surface-card))] p-4 transition-all hover:border-[rgb(var(--color-primary-500))] hover:shadow-lg"
		>
			<div className="mb-3 flex items-center justify-between">
				<span className="text-xs font-semibold text-[rgb(var(--color-fg-secondary))] uppercase">
					{status}
				</span>
				<div className="flex items-center gap-2 text-xs text-[rgb(var(--color-fg-secondary))]">
					<span>{speedLabel}</span>
					<span>•</span>
					<span>{historyGame.rated ? "Rated" : "Casual"}</span>
				</div>
			</div>
			<div className="mb-3 space-y-2">
				<div className="flex items-center justify-between text-sm gap-2">
					<span
						className={`font-medium truncate ${
							isWhiteWinner
								? "font-bold text-[rgb(var(--color-primary-500))]"
								: isDraw
									? "text-[rgb(var(--color-fg-secondary))]"
									: "text-[rgb(var(--color-fg-primary))]"
						}`}
					>
						{whiteName}
					</span>
					{whiteRating && (
						<span className="text-xs text-[rgb(var(--color-fg-secondary))] shrink-0">
							{whiteRating}
							{white?.provisional && "?"}
						</span>
					)}
				</div>
				<div className="flex items-center justify-between text-sm gap-2">
					<span
						className={`font-medium truncate ${
							isBlackWinner
								? "font-bold text-[rgb(var(--color-primary-500))]"
								: isDraw
									? "text-[rgb(var(--color-fg-secondary))]"
									: "text-[rgb(var(--color-fg-primary))]"
						}`}
					>
						{blackName}
					</span>
					{blackRating && (
						<span className="text-xs text-[rgb(var(--color-fg-secondary))] shrink-0">
							{blackRating}
							{black?.provisional && "?"}
						</span>
					)}
				</div>
			</div>
			<div className="text-xs text-[rgb(var(--color-fg-secondary))]">{createdAt}</div>
		</Link>
	);
}
