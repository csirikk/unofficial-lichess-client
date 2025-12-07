import { useAuth } from "../features/auth/hooks/useAuth";
import GameContainer from "../features/game/GameView";
import Layout from "./Layout";

export default function HomePage() {
	const { user, isLoading } = useAuth();

	return (
		<Layout>
			{isLoading ? (
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
				</div>
			) : null}

			{!user ? <h1 className="text-2xl justify-center flex font-bold">...</h1> : null}

			{!isLoading && user ? <GameContainer /> : null}
		</Layout>
	);
}
