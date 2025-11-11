import type { ReactNode } from "react";
import Navbar from "./Navbar";

interface LayoutProps {
	children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
	return (
		<div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
			<Navbar />
			<main className="container mx-auto p-4">{children}</main>
		</div>
	);
}
