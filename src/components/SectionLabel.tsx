/**
 * SectionLabel.tsx
 *
 * Small uppercase section label with optional hint text.
 */

import type { ReactNode } from "react";

type SectionLabelProps = {
	children: ReactNode;
	hint?: ReactNode;
};

export function SectionLabel({ children, hint }: SectionLabelProps) {
	return (
		<div className="mb-2 flex items-center justify-between text-sm">
			<span className="font-medium uppercase tracking-[0.18em] text-[rgb(var(--color-fg-secondary))]">
				{children}
			</span>
			{hint && <span className="text-sm text-[rgb(var(--color-fg-secondary))]">{hint}</span>}
		</div>
	);
}
