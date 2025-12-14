/**
 * sounds.ts
 *
 * Model helpers for playing game sound effects and managing audio state.
 */

export type SoundType =
	| "move-self"
	| "capture"
	| "castle"
	| "promote"
	| "move-check"
	| "game-start"
	| "game-end"
	| "tenseconds"
	| "premove"
	| "silence";

const audioCache = new Map<SoundType, HTMLAudioElement>();
let isEnabled = loadEnabledState();
let isUnlocked = false;

function loadEnabledState(): boolean {
	if (typeof localStorage === "undefined") return true;
	try {
		return localStorage.getItem("chess-sounds-enabled") !== "false";
	} catch {
		return true;
	}
}

function saveEnabledState(enabled: boolean): void {
	try {
		localStorage.setItem("chess-sounds-enabled", String(enabled));
	} catch {}
}

const soundTypes: SoundType[] = [
	"move-self",
	"capture",
	"castle",
	"promote",
	"move-check",
	"game-start",
	"game-end",
	"tenseconds",
	"premove",
	"silence",
];

// Preload all sounds into memory
soundTypes.forEach((type) => {
	const audio = new Audio(`/sounds/${type}.webm`);
	audio.preload = "auto";
	audioCache.set(type, audio);
});

// Browsers can block audio until user interaction, unlock on first gesture
if (typeof window !== "undefined") {
	const unlockAudio = () => {
		if (isUnlocked) return;

		const silent = audioCache.get("silence");
		if (!silent) return;

		silent.volume = 0;
		silent.currentTime = 0;

		silent
			.play()
			.then(() => {
				isUnlocked = true;
				cleanup();
			})
			.catch((error) => {
				console.debug("Audio unlock failed (expected until interaction)", error);
			});
	};

	const cleanup = () => {
		document.removeEventListener("mousedown", unlockAudio);
		document.removeEventListener("keydown", unlockAudio);
		document.removeEventListener("touchstart", unlockAudio);
	};

	document.addEventListener("mousedown", unlockAudio, { once: false });
	document.addEventListener("keydown", unlockAudio, { once: false });
	document.addEventListener("touchstart", unlockAudio, { once: false });
}

export function isSoundEnabled(): boolean {
	return isEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
	isEnabled = enabled;
	saveEnabledState(enabled);
}

function tryPlay(type: SoundType): void {
	if (!isEnabled) return;

	const audio = audioCache.get(type);
	if (!audio) return;

	// Clone for overlapping sounds
	const clone = audio.cloneNode(true) as HTMLAudioElement;

	// Attempt to play
	clone
		.play()
		.then(() => {
			if (!isUnlocked) isUnlocked = true;
		})
		.catch((error) => {
			if (!isUnlocked) {
				console.debug(`Audio blocked: ${type}`);
			} else {
				console.warn(`Sound error: ${type}`, error);
			}
		});
}

export function playSound(type: SoundType): void {
	tryPlay(type);
}
