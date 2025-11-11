import { useAuth } from "../features/auth";
import GameView from "../features/game/GameView";
import Layout from "./Layout";

export default function HomePage() {
	const { user, isLoading, login } = useAuth();

	return (
		<Layout>
			{isLoading ? (
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
				</div>
			) : null}

			{!user ? (
				<div className="flex min-h-screen items-center justify-center">
					<div className="max-w-md text-center">
						<h1 className="text-2xl font-bold">ITU Chess</h1>
						<button
							type="button"
							className="mt-4 rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
							onClick={login}
						>
							Sign in with Lichess
						</button>
					</div>
				</div>
			) : null}

			{!isLoading && user ? <GameView /> : null}
		</Layout>
	);
}
