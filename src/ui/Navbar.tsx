import { Settings } from "lucide-react";
import { useAuth } from "../features/auth";

export default function Navbar() {
	const { user, login, logout } = useAuth();

	const isLoggedIn = !!user;

	return (
		<header className="border-b border-surface-border bg-surface-base">
			<nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
				{/* Left: logo + brand */}
				<div className="flex items-center gap-2">
					<span className="text-lg font-semibold text-primary-500">Chess</span>
				</div>

				{/* Right: nav links + auth + settings */}
				<div className="flex items-center gap-4 sm:gap-6">
					{/* Nav links */}
					<div className="flex items-center gap-4 text-sm">
						<button type="button" className="font-medium text-primary-400 hover:text-primary-300">
							Play
						</button>
						<button type="button" className="font-medium text-fg-secondary hover:text-fg-primary">
							History
						</button>
					</div>

					{/* Divider */}
					<div className="hidden h-6 w-px border bg-surface-border sm:block" />

					{/* Auth buttons */}
					{!isLoggedIn ? (
						<div className="flex items-center gap-2 sm:gap-3">
							<button
								type="button"
								onClick={login}
								className="inline-flex items-center gap-2 rounded-2xl border border-primary-400 px-3 py-1.5 text-sm font-semibold text-primary-400 transition-colors hover:bg-[rgb(var(--color-primary-400)/0.08)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-400/70"
							>
								<span>Sign up</span>
							</button>
						</div>
					) : (
						<div className="flex items-center gap-3">
							<span className="hidden text-sm font-normal text-fg-primary sm:inline">
								{user.username}
							</span>
							<button
								type="button"
								onClick={logout}
								className="inline-flex items-center gap-2 rounded-2xl border border-primary-400 px-3 py-1.5 text-sm font-semibold text-primary-400 transition-colors hover:bg-[rgb(var(--color-primary-400)/0.08)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-400/70"
							>
								<span>Sign out</span>
							</button>
						</div>
					)}

					{/* Settings icon */}
					<button
						type="button"
						className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-secondary transition-colors hover:text-fg-primary hover:bg-[rgb(var(--color-neutral-200)/0.5)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-400/70"
						aria-label="Settings"
					>
						<Settings />
					</button>
				</div>
			</nav>
		</header>
	);
}
