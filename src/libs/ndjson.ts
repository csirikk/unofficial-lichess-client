export type NdjsonHandler<T = unknown> = (data: T) => void;

export interface StreamControl {
	closePromise: Promise<void>;
	close: () => Promise<void> | void;
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
	let buf = "";

	const process = (json: string) => {
		const trimmed = json.trim();
		if (!trimmed) return;

		try {
			const msg = JSON.parse(trimmed) as T;
			console.debug(`[${name}]`, msg);
			handler(msg);
		} catch (error) {
			console.error(`[${name}] Failed to parse JSON:`, json, error);
		}
	};

	const loop: () => Promise<void> = () =>
		stream.read().then(({ done, value }) => {
			if (done) {
				// Process any remaining data in buffer
				if (buf.length > 0) process(buf);
				return;
			}

			// Decode chunk and add to buffer
			const chunk = decoder.decode(value, { stream: true });
			buf += chunk;

			// Split by newlines
			const parts = buf.split(matcher);
			// Keep the last (incomplete) part in buffer
			buf = parts.pop() || "";

			// Process all complete lines
			for (const part of parts) {
				process(part);
			}

			return loop();
		});

	return {
		closePromise: loop(),
		close: () => stream.cancel(),
	};
}
