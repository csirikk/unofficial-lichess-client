/**
 * TimeControlGrid.tsx
 *
 * Selectable grid of time control preset cards used in setup UI.
 */

import type { ReactNode } from "react";

export type SelectableCard<T extends string> = {
	id: T;
	preset: ReactNode;
	speedBucket?: ReactNode;
	limitSeconds?: number;
	incrementSeconds?: number;
};

type SelectableCardGridProps<T extends string> = {
	value: T;
	items: SelectableCard<T>[];
	onChange: (value: T) => void;
	scrollable?: boolean;
};

export function SelectableCardGrid<T extends string>({
	value,
	items,
	onChange,
	scrollable = false,
}: SelectableCardGridProps<T>) {
	return (
		<div
			className={`
				max-h-106 px-1
				${scrollable ? "overflow-y-auto" : "overflow-hidden"}
				
				[&::-webkit-scrollbar]:w-0
				[&::-webkit-scrollbar-track]:bg-transparent
				[&::-webkit-scrollbar-thumb]:bg-gray-200
				[&::-webkit-scrollbar-thumb]:rounded-full
				dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700
				hover:[&::-webkit-scrollbar-thumb]:bg-gray-300
				dark:hover:[&::-webkit-scrollbar-thumb]:bg-neutral-600
			`}
		>
			<div className="grid gap-3 grid-cols-2 pb-1">
				{items.map((item) => (
					<PresetCard
						key={item.id}
						item={item}
						isActive={item.id === value}
						onClick={() => onChange(item.id)}
					/>
				))}
			</div>
		</div>
	);
}

type PresetCardProps<T extends string> = {
	item: SelectableCard<T>;
	isActive: boolean;
	onClick: () => void;
};

function PresetCard<T extends string>({ item, isActive, onClick }: PresetCardProps<T>) {
	const minutes = (item.limitSeconds ?? 0) / 60;
	const increment = item.incrementSeconds ?? 0;

	const baseClasses =
		"relative flex flex-col justify-between w-full h-28 rounded-lg border-2 p-3 text-left transition-all duration-200 ease-in-out overflow-hidden";

	const interactionClasses =
		"cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-500))/0.5]";

	const stateClasses = isActive
		? "border-[rgb(var(--color-primary-500))] bg-[rgb(var(--color-primary-500)/0.05)]"
		: "border-[rgb(var(--color-surface-border))] bg-[rgb(var(--color-surface-base)/0.4)] hover:border-[rgb(var(--color-primary-500)/0.3)] hover:bg-[rgb(var(--color-surface-base))]";

	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={isActive}
			className={`${baseClasses} ${interactionClasses} ${stateClasses}`}
		>
			<div className="flex w-full items-start justify-between">
				<span
					className={`text-xl uppercase tracking-widest leading-snug truncate mr-2 ${
						isActive
							? "text-[rgb(var(--color-primary-300))]"
							: "text-[rgb(var(--color-fg-primary))]"
					}`}
				>
					{item.speedBucket ? String(item.speedBucket).toUpperCase() : ""}
				</span>
			</div>

			<div className="absolute right-3 bottom-3 text-4xl p-2 font-semibold transform transition-transform duration-300 translate-y-0 group-hover:-translate-y-11 group-hover:translate-x-5 group-hover:scale-70">
				{item.preset}
			</div>

			<div className="absolute left-0 right-0 bottom-0 px-3 pb-3 transition-transform duration-250 transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
				<div
					className={`text-sm leading-tight w-full ${isActive ? "text-[rgb(var(--color-primary-600))]" : "text-[rgb(var(--color-fg-secondary))]"}`}
				>
					{item.limitSeconds !== undefined && item.limitSeconds > 0 ? (
						<>
							<div>{minutes} minutes starting time</div>
							<div>{`${increment} seconds added per move`}</div>
						</>
					) : (
						<div>Infinite time</div>
					)}
				</div>
			</div>
		</button>
	);
}
