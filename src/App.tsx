import { useEffect } from "react";

export default function App() {
	useEffect(() => {
		import("preline").then(({ HSStaticMethods }) => HSStaticMethods.autoInit());
	}, []);

	const handleAuthorize = () => {
		const url = import.meta.env.VITE_LICHESS_OAUTH_URL as string | undefined;
		if (!url) {
			alert("bad url");
			return;
		}
		window.location.href = url;
	};

	return (
		<div className="min-h-screen bg-l-bg-1 dark:bg-d-bg-1 text-l-text-1 dark:text-d-text-1 flex items-center justify-center">
			<div className="text-center space-y-4">
				<h1 className="text-2xl font-semibold">Connect your Lichess account</h1>

				{/* Preline tooltip + button */}
				<div className="hs-tooltip inline-flex">
					<button
						type="button"
						className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-hidden focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
						onClick={handleAuthorize}
					>
						Authorize
					</button>
				</div>
			</div>
		</div>
	);
}
