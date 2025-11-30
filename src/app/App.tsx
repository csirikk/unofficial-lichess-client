import { useEffect } from "react";
import { AuthCallback, AuthProvider } from "../features/auth";
import HomePage from "../ui/HomePage";

export default function App() {
	useEffect(() => {
		import("preline").then(({ HSStaticMethods }) => HSStaticMethods.autoInit());
	}, []);

	const isCallback =
		typeof window !== "undefined" && window.location.pathname.startsWith("/auth/callback");

	return <AuthProvider>{isCallback ? <AuthCallback /> : <HomePage />}</AuthProvider>;
}
