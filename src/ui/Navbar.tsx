import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { useAuth } from "../features/auth/hooks/useAuth";

export default function Navbar() {
	const { user, login, logout } = useAuth();

	const isLoggedIn = !!user;

	return (
		<header className="border-b border-surface-border bg-surface-base">
			<nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
				{/* Left: logo + brand */}
				<div className="flex items-center gap-2">
					<Link to="/" className="cursor-pointer text-lg font-semibold text-primary-500">
						Chess
					</Link>
				</div>

				{/* Right: nav links + auth + settings */}
				<div className="flex items-center gap-4 sm:gap-6">
					{/* Nav links */}
					<div className="flex items-center gap-4 text-sm">
						<Link
							to="/"
							className="cursor-pointer font-medium text-primary-400 hover:text-primary-300"
						>
							Play
						</Link>
						<Link
							to="/"
							className="cursor-pointer font-medium text-fg-secondary hover:text-fg-primary"
						>
							History
						</Link>
					</div>

					{/* Divider */}
					<div className="hidden h-6 w-px border bg-surface-border sm:block" />

					{/* Auth buttons */}
					{!isLoggedIn ? (
						<div className="flex items-center gap-2 sm:gap-3">
							<Button variant="outline" size="sm" onClick={login} className="rounded-2xl">
								<span>Sign up</span>
							</Button>
						</div>
					) : (
						<div className="flex items-center gap-3">
							<span className="hidden text-sm font-normal text-fg-primary sm:inline">
								{user.username}
							</span>
							<Button variant="outline" size="sm" onClick={logout} className="rounded-2xl">
								<span>Sign out</span>
							</Button>
						</div>
					)}

					{/* Settings icon */}
					<IconButton variant="ghost" size="md" aria-label="Settings" className="ml-1">
						<Settings />
					</IconButton>
				</div>
			</nav>
		</header>
	);
}
