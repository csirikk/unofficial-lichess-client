/**
 * Get a query parameter from the current URL
 */
export function getQueryParam(key: string): string | null {
	try {
		return new URLSearchParams(window.location.search).get(key);
	} catch {
		return null;
	}
}

/**
 * Set or delete a query parameter in the current URL
 */
export function setQueryParam(key: string, value: string | null): void {
	try {
		const url = new URL(window.location.href);
		if (value) {
			url.searchParams.set(key, value);
		} else {
			url.searchParams.delete(key);
		}
		window.history.replaceState(null, "", url);
	} catch (error) {
		console.warn(`Failed to update ${key} in URL`, error);
	}
}

/**
 * Get the game ID from the URL query string
 */
export function getGameIdFromURL(): string | null {
	return getQueryParam("game");
}

/**
 * Set the game ID in the URL query string
 */
export function setGameIdInURL(id: string | null): void {
	setQueryParam("game", id);
}
