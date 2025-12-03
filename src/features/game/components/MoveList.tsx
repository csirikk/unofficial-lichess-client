import { useEffect, useMemo, useRef } from "react";

export type MoveRow = {
	moveNumber: number;
	white: string;
	black: string;
};

export type MoveListProps = {
	moves: string[];
	visible?: boolean;
};

export function MoveList({ moves, visible = true }: MoveListProps) {
	const moveListRef = useRef<HTMLOListElement>(null);
	const prevMoveCountRef = useRef(0);

	// Convert flat moves array to rows
	const moveRows = useMemo<MoveRow[]>(
		() =>
			moves.reduce((rows, move, index) => {
				if (index % 2 === 0) {
					rows.push({
						moveNumber: Math.floor(index / 2) + 1,
						white: move,
						black: moves[index + 1] ?? "",
					});
				}
				return rows;
			}, [] as MoveRow[]),
		[moves],
	);

	// Auto-scroll to bottom when moves change
	useEffect(() => {
		const currentMoveCount = moves.length;
		if (currentMoveCount > prevMoveCountRef.current) {
			prevMoveCountRef.current = currentMoveCount;
			if (moveListRef.current) {
				setTimeout(() => {
					if (moveListRef.current) {
						moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
					}
				}, 0);
			}
		}
	}, [moves]);

	if (!visible) {
		return null;
	}

	return (
		<aside className="w-full md:w-64 shrink-0 flex-col border border-[rgb(var(--color-surface-border)/0.8)] bg-[rgb(var(--color-surface-base))] px-3 py-3 text-xs text-[rgb(var(--color-fg-secondary))] md:flex max-h-[70vh]">
			<div className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[rgb(var(--color-fg-secondary))]">
				Moves
			</div>
			<div className="flex items-center justify-between text-sm font-mono py-1 px-4 uppercase tracking-[0.18em] text-[rgb(var(--color-fg-secondary))]">
				<span className="w-8 opacity-50">#</span>
				<span className="flex-1 font-medium">White</span>
				<span className="flex-1 font-medium">Black</span>
			</div>
			<ol
				className="mt-1 flex-1 space-y-px overflow-y-auto pr-1 text-[14px] scroll-smooth"
				ref={moveListRef}
			>
				{moveRows.map((row, index) => (
					<li
						key={row.moveNumber}
						className={`flex items-center justify-between gap-2 px-1 py-0.5 ${
							index === moveRows.length - 1
								? "bg-[rgb(var(--color-surface-card))]"
								: "hover:bg-[rgb(var(--color-surface-card)/0.7)]"
						}`}
					>
						<span className="w-6 text-[rgb(var(--color-fg-secondary))]">{row.moveNumber}.</span>
						<span className="flex-1 truncate text-[rgb(var(--color-fg-primary))]">{row.white}</span>
						<span className="flex-1 truncate text-left text-[rgb(var(--color-fg-primary))]">
							{row.black}
						</span>
					</li>
				))}
			</ol>
		</aside>
	);
}
