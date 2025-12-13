/**
 * GamesPage.tsx
 *
 * Page displaying a list of ongoing and recent games.
 */

import { Link } from "react-router-dom";
import { useGameHistory } from "../features/game/hooks/useGameHistory";
import type { ApiAccountPlaying200NowPlayingItem } from "../generated/types/apiAccountPlaying200NowPlayingItem";
import type { GameJson } from "../generated/types/gameJson";
import { formatSpeed } from "../features/game/model/game-info-helpers";
import { formatClockTime } from "../features/game/model/chess";
import Layout from "../components/layout/Layout";

type OngoingGame = ApiAccountPlaying200NowPlayingItem;

export default function GamesPage() {
	const { ongoingGames, recentGames, isLoading, isAuthenticated } = useGameHistory();

	if (!isAuthenticated) {
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
						{isLoading ? (
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
					{isLoading ? (
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
