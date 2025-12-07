import { useEffect, useState } from "react";
import { accountMe } from "../../../generated/client/account";
import { apiToken, apiTokenDelete } from "../../../generated/client/oauth";
import type { UserExtended } from "../../../generated/types/userExtended";
import { CLIENT_ID, createAuthHeaders, REDIRECT_URI, SCOPES } from "../../../lib/api";
import {
	buildAuthorizationUrl,
	clearPKCEData,
	getAccessToken,
	getCodeVerifier,
	removeAccessToken,
	storeAccessToken,
	validateState,
} from "../model/pkce";

export function useAuthSession() {
	const [user, setUser] = useState<UserExtended | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Fetch user profile on mount
	useEffect(() => {
		const loadProfile = async () => {
			setIsLoading(true);
			try {
				const token = getAccessToken();
				if (token) {
					const response = await accountMe(createAuthHeaders());
					setUser(response.data);
				}
			} catch (error) {
				console.error("Failed to fetch user profile:", error);
				removeAccessToken();
			} finally {
				setIsLoading(false);
			}
		};
		loadProfile();
	}, []);

	const login = async () => {
		const authUrl = await buildAuthorizationUrl(CLIENT_ID, REDIRECT_URI, SCOPES);
		window.location.href = authUrl;
	};

	const handleCallback = async (code: string, state: string) => {
		setIsLoading(true);
		try {
			if (!validateState(state)) throw new Error("Invalid state parameter");

			const codeVerifier = getCodeVerifier();
			if (!codeVerifier) throw new Error("Code verifier not found");

			const reponse = await apiToken({
				grant_type: "authorization_code",
				code,
				code_verifier: codeVerifier,
				redirect_uri: REDIRECT_URI,
				client_id: CLIENT_ID,
			});

			if ("error" in reponse.data) {
				throw new Error(`OAuth error: ${reponse.data.error}`);
			}

			const token = (reponse.data as { access_token: string }).access_token;
			storeAccessToken(token);
			clearPKCEData();

			const response = await accountMe(createAuthHeaders());
			setUser(response.data);
		} catch (error) {
			console.error("OAuth callback error:", error);
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async () => {
		setIsLoading(true);
		try {
			const token = getAccessToken();
			if (token) await apiTokenDelete(createAuthHeaders());
		} catch (error) {
			console.error("Failed to revoke token:", error);
		} finally {
			removeAccessToken();
			setUser(null);
			setIsLoading(false);
		}
	};

	return {
		user,
		isLoading,
		isAuthenticated: user !== null,
		login,
		logout,
		handleCallback,
	};
}
