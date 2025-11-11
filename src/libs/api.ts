import { getAccessToken } from "../features/auth/pkce";

export function createAuthHeaders(): RequestInit {
	const token = getAccessToken();
	if (!token) {
		throw new Error("No access token available. User must be authenticated.");
	}

	const headers: Record<string, string> = {
		Authorization: `Bearer ${token}`,
	};
	return { headers };
}
