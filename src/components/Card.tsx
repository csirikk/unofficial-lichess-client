import type { ReactNode } from "react";

type CardProps = {
	title?: string;
	subtitle?: string;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
};

export function Card({ title, subtitle, actions, children, className = "" }: CardProps) {
	const baseClasses =
		"rounded-2xl border border-[rgb(var(--color-surface-border)/0.9)] bg-[rgb(var(--color-surface-card))] p-5 shadow-sm";

	return (
		<section className={`${baseClasses} ${className}`}>
			{(title || subtitle || actions) && (
				<header className="mb-4 flex items-start justify-between gap-3">
					<div>
						{title && (
							<h2 className="text-lg font-semibold text-[rgb(var(--color-fg-primary))]">{title}</h2>
						)}
						{subtitle && (
							<p className="mt-0.5 text-sm text-[rgb(var(--color-fg-secondary))]">{subtitle}</p>
						)}
					</div>
					{actions && <div className="shrink-0">{actions}</div>}
				</header>
			)}
			<div>{children}</div>
		</section>
	);
}
