import { useAuth } from "../features/auth";

export default function Navbar() {
	const { user, login, logout } = useAuth();

	return (
		<nav className="border-b border-gray-200 dark:border-gray-800">
			<div className="container mx-auto flex items-center justify-between p-2">
				<h1 className="text-2xl font-bold">ITU Chess</h1>
				{user ? (
					<div className="flex items-center gap-4">
						<span className="text-sm text-gray-600 dark:text-gray-400">{user.username}</span>
						<button
							type="button"
							onClick={logout}
							className="rounded bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700"
						>
							Sign out
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={login}
						className="text-sm rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						Sign in
					</button>
				)}
			</div>
		</nav>
	);
}
