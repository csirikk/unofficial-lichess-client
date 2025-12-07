import type { ReactNode } from "react";
import Navbar from "./Navbar";

interface LayoutProps {
	children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
	return (
		<div className="h-screen bg-[rgb(var(--color-surface-base))] text-[rgb(var(--color-fg-primary))] flex flex-col overflow-hidden cursor-default">
			<Navbar />
			<main className="container mx-auto w-full p-4 text-[rgb(var(--color-fg-primary))]">
				{children}
			</main>
		</div>
	);
}
