/**
 * stream.ts
 *
 * Helper functions to read and process NDJSON streams from Fetch API responses.
 */

export type NdjsonHandler<T = unknown> = (data: T) => void;

export interface StreamControl {
	closePromise: Promise<void>;
	close: () => Promise<void>;
}

export function readNdjsonStream<T = unknown>(
	name: string,
	response: Response,
	handler: NdjsonHandler<T>,
): StreamControl {
	const body = response.body;
	if (!body) {
		throw new Error("Response body is null");
	}

	const stream = body.getReader();
	const matcher = /\r?\n/;
	const decoder = new TextDecoder();
	let buf = ""; // Persists across chunks to handle JSON objects split across network packets

	const process = (json: string) => {
		const trimmed = json.trim();
		if (!trimmed) return;

		try {
			const msg = JSON.parse(trimmed) as T;
			handler(msg);
		} catch (error) {
			console.error(`[${name}] Failed to parse JSON:`, json, error);
		}
	};

	const loop = async () => {
		try {
			while (true) {
				const { done, value } = await stream.read();

				if (done) {
					if (buf.length > 0) process(buf);
					break;
				}

				const chunk = decoder.decode(value, { stream: true });
				buf += chunk;

				const parts = buf.split(matcher);
				buf = parts.pop() || "";

				for (const part of parts) {
					process(part);
				}
			}
		} catch (error) {
			if (
				(error instanceof DOMException && error.name === "AbortError") ||
				(error instanceof Error && error.name === "AbortError")
			) {
				return;
			}
			throw error;
		}
	};

	return {
		closePromise: loop(),
		close: async () => {
			try {
				await stream.cancel();
			} catch (error) {
				if (error instanceof Error && error.name !== "AbortError") {
					console.debug(`[${name}] Stream cancel error.`, error.message);
				}
			}
		},
	};
}
