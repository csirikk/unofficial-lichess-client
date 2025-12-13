/**
 * HomePage.tsx
 *
 * Main application page. Shows GameView when authenticated,
 * simple welcome message when not signed in.
 */

import { useAuth } from "../features/auth/hooks/useAuth";
import GameView from "../features/game/views/GameView";
import Layout from "../components/layout/Layout";
import { Button } from "../components/Button";

export default function HomePage() {
	const { user, isLoading, login } = useAuth();

	if (!isLoading && user) {
		return (
			<Layout>
				<GameView />
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="flex min-h-screen items-center justify-center">
				{isLoading ? (
					<p className="text-sm text-[rgb(var(--color-fg-secondary))]">Loading…</p>
				) : (
					<div className="text-center space-y-6">
						<h1 className="text-4xl font-bold text-[rgb(var(--color-fg-primary))]">Chess</h1>
						<p className="text-[rgb(var(--color-fg-secondary))]">
							Play chess with your Lichess account
						</p>
						<Button onClick={login} type="button" size="lg">
							Sign in with Lichess
						</Button>
					</div>
				)}
			</div>
		</Layout>
	);
}
