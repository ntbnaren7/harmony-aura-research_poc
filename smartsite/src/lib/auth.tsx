"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

/**
 * Auth user type (supervisor only)
 */
export interface AuthUser {
    id: string;
    email: string;
    role: "supervisor";
}

/**
 * Auth context state
 */
interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Auth provider component
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => {
        // Check localStorage on init (client-side only)
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("smartsite_auth");
            if (stored) {
                try {
                    return JSON.parse(stored) as AuthUser;
                } catch {
                    return null;
                }
            }
        }
        return null;
    });
    const [isLoading, setIsLoading] = useState(false);

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);

        // Simulate async authentication
        await new Promise(resolve => setTimeout(resolve, 800));

        // Mock validation - accept any non-empty credentials for demo
        if (email && password && password.length >= 4) {
            const authUser: AuthUser = {
                id: `sup_${Date.now()}`,
                email,
                role: "supervisor",
            };

            setUser(authUser);
            localStorage.setItem("smartsite_auth", JSON.stringify(authUser));
            setIsLoading(false);
            return true;
        }

        setIsLoading(false);
        return false;
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem("smartsite_auth");
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: user !== null,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
