import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { apiAccountPlaying, apiGamesUser } from "../../../generated/client/games";
import type { ApiAccountPlaying200NowPlayingItem } from "../../../generated/types/apiAccountPlaying200NowPlayingItem";
import type { GameJson } from "../../../generated/types/gameJson";
import { createAuthHeaders, createStreamHeaders } from "../../../lib/api";
import { readNdjsonStream } from "../../../lib/stream";

type OngoingGame = ApiAccountPlaying200NowPlayingItem;

export interface GameHistoryViewModel {
	ongoingGames: OngoingGame[];
	recentGames: GameJson[];
	isLoading: boolean;
	isAuthenticated: boolean;
}

export function useGameHistory(): GameHistoryViewModel {
	const { user, isAuthenticated } = useAuth();
	const [ongoingGames, setOngoingGames] = useState<OngoingGame[]>([]);
	const [recentGames, setRecentGames] = useState<GameJson[]>([]);
	const [isLoadingOngoing, setIsLoadingOngoing] = useState(true);
	const [isLoadingHistory, setIsLoadingHistory] = useState(true);

	const isLoading = isLoadingOngoing || isLoadingHistory;

	const fetchGames = useCallback(async () => {
		if (!user) return;

		const fetchOngoing = async () => {
			try {
				setIsLoadingOngoing(true);
				// API: GET /api/account/playing
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

		const fetchHistory = async () => {
			try {
				setIsLoadingHistory(true);
				const games: GameJson[] = [];
				// API: GET /api/games/user/{username}
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

		await Promise.all([fetchOngoing(), fetchHistory()]);
	}, [user]);

	useEffect(() => {
		fetchGames();
	}, [fetchGames]);

	return {
		ongoingGames,
		recentGames,
		isLoading,
		isAuthenticated,
	};
}
