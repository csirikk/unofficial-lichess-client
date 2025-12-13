/**
 * useGameSetup.ts
 *
 * Hooks for configuring and starting bot or online games.
 */

import { useState, useEffect, useMemo } from "react";
import {
	createDefaultBotGameSetup,
	createDefaultOnlineSetup,
	isValidGameSetup,
	getDefaultTimePresetsForMode,
	type GameSetup,
	type BotGameSetup,
	type SetupBotLevel,
	type SetupColorChoice,
} from "../model/setup";

export function useBotSetup(
	onStart: (config: {
		level: SetupBotLevel;
		clock: { limit: number; increment: number } | null;
		color: SetupColorChoice;
	}) => void,
) {
	const [setup, setSetup] = useState<BotGameSetup>(createDefaultBotGameSetup);
	const modePresets = useMemo(() => getDefaultTimePresetsForMode("bot"), []);

	const selectedPreset = modePresets.find((p) => p.id === setup.timePresetId);
	// Keep preset and time control synchronized (preset changes update time, custom breaks sync)
	useEffect(() => {
		if (selectedPreset && setup.timePresetId !== "custom") {
			if (
				selectedPreset.limitSeconds !== setup.timeControl.limit ||
				selectedPreset.incrementSeconds !== setup.timeControl.increment
			) {
				setSetup((prev) => ({
					...prev,
					timeControl: {
						limit: selectedPreset.limitSeconds,
						increment: selectedPreset.incrementSeconds,
					},
				}));
			}
		}
	}, [selectedPreset, setup.timePresetId, setup.timeControl.limit, setup.timeControl.increment]);

	const setLevel = (level: string) =>
		setSetup((prev) => ({ ...prev, botLevel: Number(level) as SetupBotLevel }));
	const setColor = (color: SetupColorChoice) =>
		setSetup((prev) => ({ ...prev, colorChoice: color }));
	const setTimePreset = (id: string) => {
		if (id === "custom") {
			setSetup((prev) => ({ ...prev, timePresetId: "custom" }));
		} else {
			const preset = modePresets.find((p) => p.id === id);
			if (preset) {
				setSetup((prev) => ({
					...prev,
					timePresetId: id,
					timeControl: { limit: preset.limitSeconds, increment: preset.incrementSeconds },
				}));
			}
		}
	};

	const setCustomTime = (limit: number, increment: number) => {
		setSetup((prev) => ({ ...prev, timeControl: { limit, increment } }));
	};

	const startGame = () => {
		const { limit, increment } = setup.timeControl;
		const isUnlimited = limit === 0 && increment === 0;
		onStart({
			level: setup.botLevel,
			clock: isUnlimited ? null : { limit, increment },
			color: setup.colorChoice,
		});
	};

	return {
		setup,
		presets: modePresets,
		isValid: isValidGameSetup(setup),
		handlers: { setLevel, setColor, setTimePreset, setCustomTime, startGame },
	} as const;
}

export function useOnlineSetup(
	rated: boolean,
	onStart: (setup: GameSetup) => void,
	onCancel: () => void,
	waitingForGame: boolean,
) {
	const [setup, setSetup] = useState<GameSetup>(() => createDefaultOnlineSetup(rated));
	const mode = rated ? "rated" : "unrated";
	const modePresets = useMemo(() => getDefaultTimePresetsForMode(mode), [mode]);

	const selectedPreset = modePresets.find((p) => p.id === setup.timePresetId);
	useEffect(() => {
		if (selectedPreset && setup.timePresetId !== "custom") {
			if (
				selectedPreset.limitSeconds !== setup.timeControl.limit ||
				selectedPreset.incrementSeconds !== setup.timeControl.increment
			) {
				setSetup((prev) => ({
					...prev,
					timeControl: {
						limit: selectedPreset.limitSeconds,
						increment: selectedPreset.incrementSeconds,
					},
				}));
			}
		}
	}, [selectedPreset, setup.timePresetId, setup.timeControl.limit, setup.timeControl.increment]);

	const setColor = (color: SetupColorChoice) =>
		setSetup((prev) => ({ ...prev, colorChoice: color }));
	const setTimePreset = (id: string) => {
		if (id === "custom") {
			setSetup((prev) => ({ ...prev, timePresetId: "custom" }));
		} else {
			const preset = modePresets.find((p) => p.id === id);
			if (preset) {
				setSetup((prev) => ({
					...prev,
					timePresetId: id,
					timeControl: { limit: preset.limitSeconds, increment: preset.incrementSeconds },
				}));
			}
		}
	};

	const setCustomTime = (limit: number, increment: number) => {
		setSetup((prev) => ({ ...prev, timeControl: { limit, increment } }));
	};

	const handleAction = () => {
		if (waitingForGame) onCancel();
		else onStart({ ...setup, rated });
	};

	return {
		setup,
		presets: modePresets,
		isValid: isValidGameSetup(setup),
		handlers: { setColor, setTimePreset, setCustomTime, handleAction },
	} as const;
}
