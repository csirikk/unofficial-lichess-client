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
	const gridContent = (
		<div className="grid gap-3 grid-cols-2">
			{items.map((item) => {
				const isActive = item.id === value;

				const baseClasses =
					"cursor-pointer group relative flex flex-col justify-between w-full h-28 rounded-lg border-2 p-3 text-left transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-500))/0.5]";

				const stateClasses = isActive
					? "border-[rgb(var(--color-primary-500))] bg-[rgb(var(--color-primary-500)/0.05)]"
					: "border-[rgb(var(--color-surface-border))] bg-[rgb(var(--color-surface-base)/0.4)] hover:border-[rgb(var(--color-primary-500)/0.3)] hover:bg-[rgb(var(--color-surface-base))]";

				const minutes =
					item.limitSeconds && item.limitSeconds > 0 ? Math.floor(item.limitSeconds / 60) : null;
				const increment = item.incrementSeconds ?? 0;

				return (
					<button
						key={item.id}
						type="button"
						onClick={() => onChange(item.id)}
						aria-pressed={isActive}
						className={`${baseClasses} ${stateClasses}`}
					>
						<div className="flex w-full justify-between items-center">
							<span
								className={`text-xl uppercase tracking-widest leading-snug truncate mr-2 ${
									isActive
										? "text-[rgb(var(--color-primary-300))]"
										: "text-[rgb(var(--color-fg-primary))]"
								}`}
							>
								{item.speedBucket ? String(item.speedBucket).toUpperCase() : ""}
							</span>
							<span
								className={`text-2xl font-semibold ${isActive ? "text-[rgb(var(--color-primary-700))]" : "text-[rgb(var(--color-fg-primary))]"}`}
							>
								{item.preset}
							</span>
						</div>

						<div
							className={`mt-2 text-sm leading-tight ${isActive ? "text-[rgb(var(--color-primary-600))]" : "text-[rgb(var(--color-fg-secondary))]"}`}
						>
							{minutes !== null ? (
								<>
									<div>{minutes} minutes starting time</div>
									<div>{`${increment} seconds added per move`}</div>
								</>
							) : (
								<div>Infinite time</div>
							)}
						</div>
					</button>
				);
			})}
		</div>
	);

	return (
		<div
			className={`
                max-h-106
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
			{gridContent}
		</div>
	);
}
