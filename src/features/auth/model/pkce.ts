/**
 * pkce.ts
 *
 * PKCE helper functions for building authorization URLs, storing/verifying state and tokens.
 *
 * Inspired by the Lichess client-side demo.
 * https://lichess.org/api and https://github.com/lichess-org/api-demo
 */

const STORAGE_PREFIX = "itu:lichess:";
const ACCESS_TOKEN_KEY = `${STORAGE_PREFIX}access_token`;
const CODE_VERIFIER_KEY = `${STORAGE_PREFIX}code_verifier`;
const STATE_KEY = `${STORAGE_PREFIX}state`;

function generateRandomString(length: number): string {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateCodeVerifier(): string {
	return generateRandomString(32); // 64 hex characters
}

export function generateState(): string {
	return generateRandomString(16); // 32 hex characters
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const hash = await crypto.subtle.digest("SHA-256", data);
	const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
	// Convert to base64url (RFC 7636 URL-safe base64 without padding)
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function buildAuthorizationUrl(
	clientId: string,
	redirectUri: string,
	scope = "board:play challenge:write",
): Promise<string> {
	const codeVerifier = generateCodeVerifier();
	const state = generateState();
	const codeChallenge = await generateCodeChallenge(codeVerifier);

	// Store verifier and state in sessionStorage (not localStorage for security)
	sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
	sessionStorage.setItem(STATE_KEY, state);

	const params = new URLSearchParams({
		response_type: "code",
		client_id: clientId,
		redirect_uri: redirectUri,
		scope,
		code_challenge_method: "S256",
		code_challenge: codeChallenge,
		state,
	});

	return `https://lichess.org/oauth?${params.toString()}`;
}

export function validateState(returnedState: string): boolean {
	const storedState = sessionStorage.getItem(STATE_KEY);
	return storedState === returnedState;
}

export function getCodeVerifier(): string | null {
	return sessionStorage.getItem(CODE_VERIFIER_KEY);
}

export function clearPKCEData(): void {
	sessionStorage.removeItem(CODE_VERIFIER_KEY);
	sessionStorage.removeItem(STATE_KEY);
}

export function storeAccessToken(token: string): void {
	localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getAccessToken(): string | null {
	return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function removeAccessToken(): void {
	localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
	return getAccessToken() !== null;
}
