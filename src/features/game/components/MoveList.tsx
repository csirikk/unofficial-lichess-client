import { useEffect, useMemo, useRef } from "react";

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
};

export function MoveList({
	moves,
	visible = true,
	viewingMoveIndex = null,
	onMoveClick,
}: MoveListProps) {
	const moveListRef = useRef<HTMLOListElement>(null);
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
						moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
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
			rounded px-1 -mx-1
			${isActive ? "text-[rgb(var(--color-primary-500))]" : ""}
			${isClickable && !isActive ? "cursor-pointer hover:bg-[rgb(var(--color-surface-card)/0.7)]" : ""}
			${isClickable ? "cursor-pointer" : ""}
			`;
	};

	return (
		<aside className="flex h-full w-full shrink-0 flex-col border border-[rgb(var(--color-surface-border)/0.8)] bg-[rgb(var(--color-surface-base))] px-3 py-3 text-xs text-[rgb(var(--color-fg-secondary))]">
			<div className="mb-2 cursor-default text-xl font-semibold uppercase tracking-[0.25em] text-[rgb(var(--color-fg-secondary))]">
				Moves
			</div>
			<div className="flex cursor-default items-center justify-between px-0.5 py-1 text-sm font-mono uppercase tracking-[0.18em] text-[rgb(var(--color-fg-secondary))]">
				<span className="w-8 opacity-50">#</span>
				<span className="flex-1 text-lg">White</span>
				<span className="flex-1 text-lg">Black</span>
			</div>
			<ol
				className="mt-1 flex-1 cursor-default space-y-px overflow-y-auto pr-1 text-[14px] scroll-smooth"
				ref={moveListRef}
			>
				{moveRows.map((row) => (
					<li key={row.moveNumber} className="flex items-center justify-between gap-2 px-1 py-0.5">
						<span className="w-6 text-[rgb(var(--color-fg-secondary))]">{row.moveNumber}.</span>
						<button
							type="button"
							className={`flex-1 truncate border-none bg-transparent text-left text-[rgb(var(--color-fg-primary))] ${getMoveClassName(row.whiteIndex)}`}
							onClick={() => onMoveClick?.(row.whiteIndex)}
							disabled={!onMoveClick}
						>
							{row.white}
						</button>
						{row.blackIndex !== null ? (
							<button
								type="button"
								className={`flex-1 truncate border-none bg-transparent text-left text-[rgb(var(--color-fg-primary))] ${getMoveClassName(row.blackIndex)}`}
								onClick={() => row.blackIndex !== null && onMoveClick?.(row.blackIndex)}
								disabled={!onMoveClick}
							>
								{row.black}
							</button>
						) : (
							<span className="flex-1 truncate text-left text-[rgb(var(--color-fg-primary))]">
								{row.black}
							</span>
						)}
					</li>
				))}
			</ol>
		</aside>
	);
}
