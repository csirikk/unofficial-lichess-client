/**
 * AuthProvider.tsx
 *
 * ViewModel providing authentication context to the application via React Context.
 * Uses useAuthSession hook to manage auth state and exposes it through AuthContext.
 */

import type { ReactNode } from "react";
import { createContext } from "react";
import type { AuthContextType } from "./hooks/useAuth";
import { useAuthSession } from "./hooks/useAuthSession";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
	children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const auth = useAuthSession();
	return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
