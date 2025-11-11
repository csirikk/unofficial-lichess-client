import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { apiToken, apiTokenDelete } from "../../generated/client/oauth";
import { accountMe } from "../../generated/client/account";
import type { UserExtended } from "../../generated/types/userExtended";
import {
	buildAuthorizationUrl,
	clearPKCEData,
	getAccessToken,
	getCodeVerifier,
	removeAccessToken,
	storeAccessToken,
	validateState,
} from "./pkce";
import { createAuthHeaders, CLIENT_ID, REDIRECT_URI, SCOPES } from "../../libs/api";

interface AuthContextType {
	user: UserExtended | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: () => Promise<void>;
	logout: () => Promise<void>;
	handleCallback: (code: string, state: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}

interface AuthProviderProps {
	children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [user, setUser] = useState<UserExtended | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Fetch user profile on mount if authenticated
	useEffect(() => {
		const loadProfile = async () => {
			setIsLoading(true);
			try {
				const token = getAccessToken();
				console.log("[auth] loadProfile: found token?", Boolean(token));
				if (token) {
					// GET /api/account
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
			if (!validateState(state)) {
				throw new Error("Invalid state parameter");
			}

			const codeVerifier = getCodeVerifier();
			if (!codeVerifier) {
				throw new Error("Code verifier not found");
			}

			// POST /api/token
			const reponse = await apiToken({
				grant_type: "authorization_code",
				code,
				code_verifier: codeVerifier,
				redirect_uri: REDIRECT_URI,
				client_id: CLIENT_ID,
			});

			if ("error" in reponse.data) {
				throw new Error(`OAuth error: ${reponse.data.error} - ${reponse.data.error_description}`);
			}

			const tokenData = reponse.data as { access_token: string };
			const token = tokenData.access_token;

			storeAccessToken(token);

			clearPKCEData();

			// GET /api/account
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
			if (token) {
				// DELETE /api/token
				try {
					await apiTokenDelete(createAuthHeaders());
				} catch (error) {
					console.warn("apiTokenDelete failed:", error);
				}
			}
		} catch (error) {
			console.error("Failed to revoke token:", error);
		} finally {
			// Clear token and user regardless of API call success
			removeAccessToken();
			setUser(null);
			setIsLoading(false);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				isAuthenticated: user !== null,
				login,
				logout,
				handleCallback,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
