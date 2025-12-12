/**
 * AuthCallback Component
 *
 * Handles the OAuth callback from Lichess.
 */
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Layout from "../../../components/layout/Layout";
import { useAuth } from "../hooks/useAuth";

export default function AuthCallback() {
	const { handleCallback } = useAuth();
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const hasRun = useRef(false);

	useEffect(() => {
		// Prevent double run
		if (hasRun.current) return;
		hasRun.current = true;

		const processCallback = async () => {
			// Read URL parameters
			const code = searchParams.get("code");
			const state = searchParams.get("state");
			const oauthError = searchParams.get("error");
			const errorDescription = searchParams.get("error_description");

			// Clear URL parameters
			setSearchParams({});

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
				navigate("/", { replace: true });
				return;
			}

			try {
				await handleCallback(code, state);
				// Mark code as used
				sessionStorage.setItem(marker, "1");
				navigate("/", { replace: true });
			} catch (error) {
				setError(error instanceof Error ? error.message : "Authentication failed");
			}
		};

		processCallback();
	}, [handleCallback, searchParams, setSearchParams, navigate]);

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
