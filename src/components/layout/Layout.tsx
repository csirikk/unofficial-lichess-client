/**
 * Layout.tsx
 *
 * App layout component providing header and main content area.
 */

import type { ReactNode } from "react";
import Navbar from "./Navbar";

interface LayoutProps {
	children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
	return (
		<div className="flex overflow-auto lg:overflow-hidden h-screen flex-col cursor-default bg-[rgb(var(--color-surface-base))] text-[rgb(var(--color-fg-primary))]">
			<Navbar />
			<main className="flex flex-1 items-stretch justify-center px-4 py-2">
				<div className="flex h-full min-h-0">{children}</div>
			</main>
		</div>
	);
}
