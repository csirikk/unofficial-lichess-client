/**
 * api.ts
 *
 * API helper functions for authenticated requests and streaming.
 */

import { getAccessToken } from "../features/auth/model/pkce";

export const CLIENT_ID = "itu";
export const REDIRECT_URI = "http://localhost:3000/auth/callback";
export const SCOPES = "board:play challenge:write challenge:read";

export function createAuthHeaders(accept?: string): RequestInit {
	const token = getAccessToken();
	if (!token) {
		throw new Error("No access token available. User must be authenticated.");
	}

	const headers: HeadersInit = {
		Authorization: `Bearer ${token}`,
	};

	if (accept) {
		headers.Accept = accept;
	}

	return { headers };
}

export function createStreamHeaders(): RequestInit {
	return createAuthHeaders("application/x-ndjson");
}
