/**
 * Navbar.tsx
 *
 * Top navigation bar with links, auth status, and settings access.
 */

import { Link } from "react-router-dom";
import { Button } from "../Button";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { SettingsDropdown } from "./SettingsDropdown";

export default function Navbar() {
	const { user, login, logout } = useAuth();

	const isLoggedIn = !!user;

	return (
		<header className="mb-6">
			<nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
				{/* Left: logo + brand */}
				<div className="flex items-center gap-2">
					<Link
						to="/"
						className="cursor-pointer text-xl font-bold text-[rgb(var(--color-fg-primary))]"
					>
						Chess
					</Link>
				</div>

				{/* Right: nav links + auth + settings */}
				<div className="flex items-center gap-3 sm:gap-4">
					{/* Nav links */}
					<div className="flex items-center gap-3 sm:gap-4 text-sm">
						<Link
							to="/"
							className="cursor-pointer font-medium text-[rgb(var(--color-fg-secondary))] hover:text-[rgb(var(--color-fg-primary))] transition-colors"
						>
							Play
						</Link>
						<Link
							to="/games"
							className="cursor-pointer font-medium text-[rgb(var(--color-fg-secondary))] hover:text-[rgb(var(--color-fg-primary))] transition-colors"
						>
							Games
						</Link>
					</div>

					{/* Divider */}
					<div className="hidden h-5 w-px bg-[rgb(var(--color-surface-border)/0.5)] sm:block" />

					{/* Auth buttons */}
					{!isLoggedIn ? (
						<Button variant="outline" size="sm" onClick={login}>
							Sign in
						</Button>
					) : (
						<div className="flex items-center gap-3">
							<span className="text-sm text-[rgb(var(--color-fg-secondary))]">
								{user?.username || user?.id || "User"}
							</span>
							<Button variant="outline" size="sm" onClick={logout}>
								Sign out
							</Button>
						</div>
					)}

					{/* Settings dropdown */}
					<SettingsDropdown />
				</div>
			</nav>
		</header>
	);
}
