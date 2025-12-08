import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "../../../components/IconButton";

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

	return (
		<div className="flex flex-col items-center justify-center gap-1 py-2">
			<div className="flex items-center justify-center gap-1">
				<IconButton
					variant="ghost"
					size="md"
					onClick={onGoToStart}
					disabled={atStart}
					title="First move"
					aria-label="First move"
				>
					<ChevronFirst />
				</IconButton>

				<IconButton
					variant="ghost"
					size="md"
					onClick={onGoBack}
					disabled={!canGoBack}
					title="Previous move"
					aria-label="Previous move"
				>
					<ChevronLeft />
				</IconButton>

				<IconButton
					variant="ghost"
					size="md"
					onClick={onGoForward}
					disabled={!canGoForward}
					title="Next move"
					aria-label="Next move"
				>
					<ChevronRight />
				</IconButton>

				<IconButton
					variant="ghost"
					size="md"
					onClick={onGoToLive}
					disabled={atLive}
					title="Last move"
					aria-label="Last move"
					className={isViewingHistory ? "text-[rgb(var(--color-primary-500))]" : ""}
				>
					<ChevronLast />
				</IconButton>
			</div>

			{isViewingHistory && (
				<span className="text-sm text-[rgb(var(--color-primary-500))]">Viewing history</span>
			)}
		</div>
	);
}
