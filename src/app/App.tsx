import { useEffect } from "react";
import AuthCallback from "../features/auth/components/AuthCallback";
import { AuthProvider } from "../features/auth/AuthProvider";
import HomePage from "../ui/HomePage";

export default function App() {
	useEffect(() => {
		import("preline").then(({ HSStaticMethods }) => HSStaticMethods.autoInit());
	}, []);

	const isCallback =
		typeof window !== "undefined" && window.location.pathname.startsWith("/auth/callback");

	return <AuthProvider>{isCallback ? <AuthCallback /> : <HomePage />}</AuthProvider>;
}
