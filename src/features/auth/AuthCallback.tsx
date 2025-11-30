import { useEffect, useRef, useState } from "react";
import Layout from "../../ui/Layout";
import { useAuth } from "./AuthProvider";

export default function AuthCallback() {
	const { handleCallback } = useAuth();
	const [error, setError] = useState<string | null>(null);
	const hasRun = useRef(false);

	useEffect(() => {
		// Prevent double run
		if (hasRun.current) return;
		hasRun.current = true;

		const processCallback = async () => {
			// Read URL
			const url = new URL(window.location.href);
			const code = url.searchParams.get("code");
			const state = url.searchParams.get("state");
			const oauthError = url.searchParams.get("error");
			const errorDescription = url.searchParams.get("error_description");

			// Clear URL
			url.search = "";
			window.history.replaceState({}, document.title, url.toString());

			if (oauthError) {
				setError(
					`Authorization failed: ${oauthError}${errorDescription ? ` - ${errorDescription}` : ""}`,
				);
				return;
			}

			if (!code || !state) {
				setError("Missing required OAuth parameters");
				return;
			}

			// Prevent reuse of codes
			const marker = `oauth_code_used:${code}`;
			if (sessionStorage.getItem(marker)) {
				window.location.replace("/");
				return;
			}

			try {
				await handleCallback(code, state);
				// Mark code as used
				sessionStorage.setItem(marker, "1");
				window.location.replace("/");
			} catch (error) {
				setError(error instanceof Error ? error.message : "Authentication failed");
			}
		};

		processCallback();
	}, [handleCallback]);

	return (
		<Layout>
			{error ? (
				<div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400">
					Error: {error}
				</div>
			) : (
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-sm text-gray-600 dark:text-gray-400">Completing authentication…</p>
				</div>
			)}
		</Layout>
	);
}
