import { Settings, Volume2, VolumeX, Play, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "../components/IconButton";
import {
	playSound,
	isSoundEnabled,
	setSoundEnabled,
	type SoundType,
} from "../features/game/model/sounds";

// Define the order for sound preview cycling
const PREVIEW_ORDER: SoundType[] = [
	"move-self",
	"capture",
	"castle",
	"promote",
	"move-check",
	"game-start",
	"game-end",
	"tenseconds",
	"premove",
];

export function SettingsDropdown() {
	const [isOpen, setIsOpen] = useState(false);
	const [soundsEnabled, setSoundsEnabled] = useState(() => isSoundEnabled());
	const [previewIndex, setPreviewIndex] = useState(0);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	const toggleSounds = () => {
		const newState = !soundsEnabled;
		setSoundsEnabled(newState);
		setSoundEnabled(newState);
	};

	const previewNextSound = () => {
		const currentSound = PREVIEW_ORDER[previewIndex];
		playSound(currentSound);
		setPreviewIndex((prev) => (prev + 1) % PREVIEW_ORDER.length);
	};

	const currentPreviewSound = PREVIEW_ORDER[previewIndex];

	return (
		<div className="relative" ref={dropdownRef}>
			<IconButton
				variant="ghost"
				size="md"
				aria-label="Settings"
				className="ml-1"
				onClick={() => setIsOpen(!isOpen)}
			>
				<Settings />
			</IconButton>

			{isOpen && (
				<div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-[rgb(var(--color-surface-border))] bg-[rgb(var(--color-surface-base))] shadow-lg z-50">
					<div className="p-2">
						{/* Header */}
						<div className="px-3 py-2 text-xs font-semibold text-[rgb(var(--color-fg-secondary))] uppercase tracking-wide">
							Settings
						</div>

						{/* Sound Toggle */}
						<button
							type="button"
							onClick={toggleSounds}
							className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-[rgb(var(--color-surface-border)/0.5)] transition-colors text-left"
						>
							<div className="flex items-center gap-3">
								{soundsEnabled ? (
									<Volume2 className="h-4 w-4 text-[rgb(var(--color-fg-secondary))]" />
								) : (
									<VolumeX className="h-4 w-4 text-[rgb(var(--color-fg-secondary))]" />
								)}
								<span className="text-sm text-[rgb(var(--color-fg-primary))]">Sound Effects</span>
							</div>
							<div
								className={`relative w-11 h-6 rounded-full transition-colors ${
									soundsEnabled
										? "bg-[rgb(var(--color-primary-500))]"
										: "bg-[rgb(var(--color-surface-border))]"
								}`}
							>
								<div
									className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
										soundsEnabled ? "translate-x-5.5" : "translate-x-0.5"
									}`}
								/>
							</div>
						</button>

						{/* Sound Preview */}
						{soundsEnabled && (
							<button
								type="button"
								onClick={previewNextSound}
								className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-[rgb(var(--color-surface-border)/0.5)] transition-colors text-left mt-1"
							>
								<div className="flex items-center gap-3">
									<Play className="h-4 w-4 text-[rgb(var(--color-fg-secondary))]" />
									<div className="flex flex-col">
										<span className="text-sm text-[rgb(var(--color-fg-primary))]">
											Preview Sounds
										</span>
										<span className="text-xs text-[rgb(var(--color-fg-secondary))]">
											{currentPreviewSound.replace("-", " ")}
										</span>
									</div>
								</div>
								<ChevronRight className="h-4 w-4 text-[rgb(var(--color-fg-secondary))]" />
							</button>
						)}

						{/* Divider */}
						<div className="my-2 border-t border-[rgb(var(--color-surface-border))]" />

						{/* Show Coordinates */}
						<button
							type="button"
							className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-[rgb(var(--color-surface-border)/0.5)] transition-colors text-left opacity-50 cursor-not-allowed mt-1"
							disabled
						>
							<span className="text-sm text-[rgb(var(--color-fg-primary))]">Show coordinates</span>
							<span className="text-xs text-[rgb(var(--color-fg-secondary))]">todo</span>
						</button>

						{/* Premove */}
						<button
							type="button"
							className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-[rgb(var(--color-surface-border)/0.5)] transition-colors text-left opacity-50 cursor-not-allowed mt-1"
							disabled
						>
							<span className="text-sm text-[rgb(var(--color-fg-primary))]">Enable premoves</span>
							<span className="text-xs text-[rgb(var(--color-fg-secondary))]">todo</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
