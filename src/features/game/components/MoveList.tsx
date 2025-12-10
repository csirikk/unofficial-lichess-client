import { useEffect, useMemo, useRef } from "react";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "../../../components/IconButton";

export type MoveRow = {
	moveNumber: number;
	white: string;
	black: string;
	whiteIndex: number;
	blackIndex: number | null;
};

export type MoveListProps = {
	moves: string[];
	visible?: boolean;
	viewingMoveIndex?: number | null;
	onMoveClick?: (moveIndex: number) => void;
	onGoToStart?: () => void;
	onGoBack?: () => void;
	onGoForward?: () => void;
	onGoToLive?: () => void;
};

export function MoveList({
	moves,
	visible = true,
	viewingMoveIndex = null,
	onMoveClick,
	onGoToStart,
	onGoBack,
	onGoForward,
	onGoToLive,
}: MoveListProps) {
	const moveListRef = useRef<HTMLTableSectionElement>(null);
	const prevMoveCountRef = useRef(0);

	// Convert flat moves array to rows + indexes
	const moveRows = useMemo<MoveRow[]>(
		() =>
			moves.reduce((rows, move, index) => {
				if (index % 2 === 0) {
					rows.push({
						moveNumber: Math.floor(index / 2) + 1,
						white: move,
						black: moves[index + 1] ?? "",
						whiteIndex: index,
						blackIndex: moves[index + 1] !== undefined ? index + 1 : null,
					});
				}
				return rows;
			}, [] as MoveRow[]),
		[moves],
	);

	const activeMoveIndex = viewingMoveIndex ?? (moves.length > 0 ? moves.length - 1 : null);

	// Auto-scroll to viewed move or latest when in live mode
	useEffect(() => {
		const currentMoveCount = moves.length;
		const isLiveMode = viewingMoveIndex === null;

		if (isLiveMode && currentMoveCount > prevMoveCountRef.current) {
			prevMoveCountRef.current = currentMoveCount;
			if (moveListRef.current) {
				setTimeout(() => {
					if (moveListRef.current) {
						const lastRow = moveListRef.current.lastElementChild as HTMLElement | null;
						if (lastRow) {
							lastRow.scrollIntoView({ behavior: "smooth", block: "end" });
						}
					}
				}, 0);
			}
		}

		// When viewing history, scroll the active move into view
		if (!isLiveMode && viewingMoveIndex !== null && viewingMoveIndex >= 0 && moveListRef.current) {
			const rowIndex = Math.floor(viewingMoveIndex / 2);
			const rowElement = moveListRef.current.children[rowIndex] as HTMLElement | undefined;
			if (rowElement) {
				rowElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
			}
		}
	}, [moves, viewingMoveIndex]);

	if (!visible) {
		return null;
	}

	const getMoveClassName = (moveIndex: number | null) => {
		if (moveIndex === null) return "";

		const isActive = moveIndex === activeMoveIndex;
		const isClickable = onMoveClick !== undefined;

		return `
			rounded px-3 -mx-2
			${isActive ? "text-[rgb(var(--color-primary-500))]" : ""}
			${isClickable && !isActive ? "cursor-pointer hover:bg-[rgb(var(--color-surface-card)/0.7)]" : ""}
			${isClickable ? "cursor-pointer" : ""}
			`;
	};

	const isViewingHistory = viewingMoveIndex !== null;
	const totalMoves = moves.length;
	const atStart = viewingMoveIndex === -1 || (viewingMoveIndex === null && totalMoves === 0);
	const atLive = viewingMoveIndex === null;
	const canGoBack = totalMoves > 0 && !atStart;
	const canGoForward = totalMoves > 0 && !atLive;

	return (
		<aside className="flex h-full w-full shrink-0 flex-col border border-[rgb(var(--color-surface-border)/0.8)] bg-[rgb(var(--color-surface-base))] px-3 py-3 text-sm text-[rgb(var(--color-fg-secondary))]">
			<div className="mb-2 flex items-center justify-between">
				<div
					className={`cursor-default text-xl font-semibold uppercase tracking-[0.25em] ${isViewingHistory ? "text-[rgb(var(--color-primary-500))] opacity-80" : "text-[rgb(var(--color-fg-secondary))]"}`}
				>
					Moves
				</div>
				{isViewingHistory && (
					<span className="text-sm text-[rgb(var(--color-primary-500))]">Viewing history</span>
				)}
			</div>
			<div
				className="flex-1 overflow-y-auto 
			[&::-webkit-scrollbar]:w-2 
			[&::-webkit-scrollbar-track]:rounded-full 
			[&::-webkit-scrollbar-track]:bg-[rgb(var(--color-surface-card))] 
			[&::-webkit-scrollbar-thumb]:rounded-full 
			[&::-webkit-scrollbar-thumb]:bg-[rgb(var(--color-surface-border))]"
			>
				<table className="min-w-full divide-y divide-[rgb(var(--color-surface-border)/0.5)]">
					<thead className="sticky top-0 bg-[rgb(var(--color-surface-base))] border-none">
						<tr>
							<th
								scope="col"
								className="px-2 py-2 text-left text-sm font-mono uppercase tracking-[0.18em] text-[rgb(var(--color-fg-secondary))] opacity-50"
							>
								#
							</th>
							<th
								scope="col"
								className="px-2 py-2 text-left text-lg font-mono uppercase tracking-[0.18em] text-[rgb(var(--color-fg-secondary))]"
							>
								White
							</th>
							<th
								scope="col"
								className="px-2 py-2 text-left text-lg font-mono uppercase tracking-[0.18em] text-[rgb(var(--color-fg-secondary))]"
							>
								Black
							</th>
						</tr>
					</thead>
					<tbody ref={moveListRef}>
						{moveRows.map((row, index) => (
							<tr
								key={row.moveNumber}
								className={
									index % 2 === 0
										? "bg-[rgb(var(--color-surface-base))]"
										: "bg-[rgb(var(--color-surface-card)/0.3)]"
								}
							>
								<td className="whitespace-nowrap px-2 py-1.5 text-sm text-[rgb(var(--color-fg-secondary))]">
									{row.moveNumber}.
								</td>
								<td className="whitespace-nowrap px-2 py-1.5 text-md">
									<button
										type="button"
										className={`truncate bg-transparent text-left text-[rgb(var(--color-fg-primary))] ${getMoveClassName(row.whiteIndex)}`}
										onClick={() => onMoveClick?.(row.whiteIndex)}
										disabled={!onMoveClick}
									>
										{row.white}
									</button>
								</td>
								<td className="whitespace-nowrap px-2 py-1.5 text-md">
									{row.blackIndex !== null ? (
										<button
											type="button"
											className={`truncate bg-transparent text-left text-[rgb(var(--color-fg-primary))] ${getMoveClassName(row.blackIndex)}`}
											onClick={() => row.blackIndex !== null && onMoveClick?.(row.blackIndex)}
											disabled={!onMoveClick}
										>
											{row.black}
										</button>
									) : (
										<span className="truncate text-left text-[rgb(var(--color-fg-primary))]">
											{row.black}
										</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{onGoToStart && onGoBack && onGoForward && onGoToLive && (
				<div className="flex items-center justify-center gap-1 border-t border-[rgb(var(--color-surface-border)/0.5)] pt-2">
					<IconButton
						variant="ghost"
						size="lg"
						onClick={onGoToStart}
						disabled={atStart}
						title="First move"
						aria-label="First move"
					>
						<ChevronFirst />
					</IconButton>

					<IconButton
						variant="ghost"
						size="lg"
						onClick={onGoBack}
						disabled={!canGoBack}
						title="Previous move"
						aria-label="Previous move"
					>
						<ChevronLeft />
					</IconButton>

					<IconButton
						variant="ghost"
						size="lg"
						onClick={onGoForward}
						disabled={!canGoForward}
						title="Next move"
						aria-label="Next move"
					>
						<ChevronRight />
					</IconButton>

					<IconButton
						variant="ghost"
						size="lg"
						onClick={onGoToLive}
						disabled={atLive}
						title="Last move"
						aria-label="Last move"
						className={isViewingHistory ? "text-[rgb(var(--color-primary-500))]" : ""}
					>
						<ChevronLast />
					</IconButton>
				</div>
			)}
		</aside>
	);
}
