import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";

export type HistoryControlsProps = {
	onGoToStart: () => void;
	onGoBack: () => void;
	onGoForward: () => void;
	onGoToLive: () => void;
	isViewingHistory: boolean;
	viewingMoveIndex: number | null;
	totalMoves: number;
};

export function HistoryControls({
	onGoToStart,
	onGoBack,
	onGoForward,
	onGoToLive,
	isViewingHistory,
	viewingMoveIndex,
	totalMoves,
}: HistoryControlsProps) {
	const atStart = viewingMoveIndex === -1 || (viewingMoveIndex === null && totalMoves === 0);
	const atLive = viewingMoveIndex === null;
	const canGoBack = totalMoves > 0 && !atStart;
	const canGoForward = totalMoves > 0 && !atLive;

	const buttonClass = `
		inline-flex items-center justify-center p-2 rounded
		text-[rgb(var(--color-fg-secondary))]
		hover:bg-[rgb(var(--color-surface-border)/0.5)]
		hover:text-[rgb(var(--color-fg-primary))]
		disabled:opacity-30 disabled:cursor-not-allowed
		disabled:hover:bg-transparent disabled:hover:text-[rgb(var(--color-fg-secondary))]
		transition-colors
		cursor-pointer
	`;

	return (
		<div className="flex flex-col items-center justify-center gap-1 py-2">
			<div className="flex items-center justify-center gap-1">
				<button
					type="button"
					onClick={onGoToStart}
					disabled={atStart}
					className={buttonClass}
					title="First move"
					aria-label="First move"
				>
					<ChevronFirst className="h-5 w-5" />
				</button>

				<button
					type="button"
					onClick={onGoBack}
					disabled={!canGoBack}
					className={buttonClass}
					title="Previous move"
					aria-label="Previous move"
				>
					<ChevronLeft className="h-5 w-5" />
				</button>

				<button
					type="button"
					onClick={onGoForward}
					disabled={!canGoForward}
					className={buttonClass}
					title="Next move"
					aria-label="Next move"
				>
					<ChevronRight className="h-5 w-5" />
				</button>

				<button
					type="button"
					onClick={onGoToLive}
					disabled={atLive}
					className={`${buttonClass} ${isViewingHistory ? "text-[rgb(var(--color-primary-500))]" : ""}`}
					title="Last move"
					aria-label="Last move"
				>
					<ChevronLast className="h-5 w-5" />
				</button>
			</div>

			{isViewingHistory && (
				<span className="text-sm text-[rgb(var(--color-primary-500))]">Viewing history</span>
			)}
		</div>
	);
}
