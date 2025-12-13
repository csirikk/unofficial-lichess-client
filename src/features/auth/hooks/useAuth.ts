/**
 * useAuth.ts
 *
 * Hook to consume the `AuthContext` and provide authentication state to components.
 */

import { useContext } from "react";
import type { UserExtended } from "../../../generated/types/userExtended";
import { AuthContext } from "../AuthProvider";

export interface AuthContextType {
	user: UserExtended | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: () => Promise<void>;
	logout: () => Promise<void>;
	handleCallback: (code: string, state: string) => Promise<void>;
}

export function useAuth(): AuthContextType {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}
