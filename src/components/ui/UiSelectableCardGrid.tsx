import type { ReactNode } from "react";

export type UiSelectableCard<T extends string> = {
	id: T;
	title: ReactNode;
	subtitle?: ReactNode;
};

type UiSelectableCardGridProps<T extends string> = {
	value: T;
	items: UiSelectableCard<T>[];
	onChange: (value: T) => void;
};

export function UiSelectableCardGrid<T extends string>({
	value,
	items,
	onChange,
}: UiSelectableCardGridProps<T>) {
	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{items.map((item) => {
				const isActive = item.id === value;
				const buttonClasses = isActive
					? "flex flex-col items-start rounded-xl border px-3 py-2 transition border-[rgb(var(--color-primary-500))] bg-[rgb(var(--color-primary-500)/0.08)]"
					: "flex flex-col items-start rounded-xl border px-3 py-2 transition border-[rgb(var(--color-surface-border))] bg-[rgb(var(--color-surface-base)/0.2)] hover:border-[rgb(var(--color-primary-400))] hover:bg-[rgb(var(--color-surface-base))]";

				return (
					<button
						key={item.id}
						type="button"
						onClick={() => onChange(item.id)}
						aria-pressed={isActive}
						className={buttonClasses}
					>
						<span className="text-sm font-semibold text-[rgb(var(--color-fg-primary))]">
							{item.title}
						</span>
						{item.subtitle && (
							<span className="text-xs uppercase tracking-[0.15em] text-[rgb(var(--color-fg-secondary))]">
								{item.subtitle}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
