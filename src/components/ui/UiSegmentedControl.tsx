import type { ReactNode } from "react";

export type UiSegmentedOption<T extends string> = {
	value: T;
	label: ReactNode;
};

type UiSegmentedControlProps<T extends string> = {
	value: T;
	options: UiSegmentedOption<T>[];
	onChange: (value: T) => void;
	className?: string;
};

export function UiSegmentedControl<T extends string>({
	value,
	options,
	onChange,
	className = "",
}: UiSegmentedControlProps<T>) {
	const containerClasses = [
		"inline-flex rounded-full border border-[rgb(var(--color-surface-border))]",
		"bg-[rgb(var(--color-surface-base))] p-1 text-sm font-medium",
		className,
	].join(" ");

	return (
		<div className={containerClasses}>
			{options.map((opt) => {
				const isActive = opt.value === value;
				const buttonClasses = isActive
					? "px-3 py-1 rounded-full transition-colors bg-[rgb(var(--color-primary-500))] text-[rgb(var(--color-fg-on-primary))]"
					: "px-3 py-1 rounded-full transition-colors text-[rgb(var(--color-fg-secondary))] hover:bg-[rgb(var(--color-surface-border)/0.7)]";

				return (
					<button
						key={String(opt.value)}
						type="button"
						onClick={() => onChange(opt.value)}
						aria-pressed={isActive}
						className={buttonClasses}
					>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}
