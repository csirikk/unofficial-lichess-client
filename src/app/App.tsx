import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthCallback from "../features/auth/components/AuthCallback";
import { AuthProvider } from "../features/auth/AuthProvider";
import HomePage from "../pages/HomePage";
import GamesPage from "../pages/GamesPage";

export default function App() {
	useEffect(() => {
		import("preline").then(({ HSStaticMethods }) => HSStaticMethods.autoInit());
	}, []);

	return (
		<AuthProvider>
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/games" element={<GamesPage />} />
				<Route path="/auth/callback" element={<AuthCallback />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</AuthProvider>
	);
}
