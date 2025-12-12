import { useMemo } from "react";
import { type TimePreset, DEFAULT_PRESET_IDS, findTimePreset } from "../model/setup";

type PresetMode = "bot" | "unrated" | "rated";

type StoredPresets = Record<PresetMode, TimePreset[]>;

export function useTimePresets() {
	const presets = useMemo<StoredPresets>(
		() => ({
			bot: getDefaultsForMode("bot"),
			unrated: getDefaultsForMode("unrated"),
			rated: getDefaultsForMode("rated"),
		}),
		[],
	);

	return { presets };
}

function getDefaultsForMode(mode: PresetMode): TimePreset[] {
	const ids = DEFAULT_PRESET_IDS[mode] ?? [];
	return ids
		.map((id) => findTimePreset(id))
		.filter((p): p is TimePreset => !!p)
		.map((p) => ({ ...p }));
}
