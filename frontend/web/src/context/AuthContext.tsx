import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import API from "../utils/client";

interface AuthContextType {
  token: string | null;
  username: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isStudent: boolean;
  isLoading: boolean;
  login: (token: string, username: string, role: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate on app load (refresh, new tab, etc.)
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");
    const storedRole = localStorage.getItem("role");

    if (storedToken) {
      setToken(storedToken);
      setUsername(storedUsername);
      setRole(storedRole);
      // keep axios in sync immediately, same as login.tsx does today
      API.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
    }

    setIsLoading(false);
  }, []);

  // Cross-tab sync: the "storage" event fires in OTHER tabs whenever
  // localStorage changes in THIS tab (it never fires in the tab that made
  // the change). So if Tab A logs out or logs back in, Tab B hears about
  // it here and updates its own state to match, instead of staying stale.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== "token" && e.key !== "username" && e.key !== "role") return;

      const currentToken = localStorage.getItem("token");
      const currentUsername = localStorage.getItem("username");
      const currentRole = localStorage.getItem("role");

      if (currentToken) {
        setToken(currentToken);
        setUsername(currentUsername);
        setRole(currentRole);
        API.defaults.headers.common["Authorization"] = `Bearer ${currentToken}`;
      } else {
        // token was removed in another tab -> log this tab out too
        setToken(null);
        setUsername(null);
        setRole(null);
        delete API.defaults.headers.common["Authorization"];
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = (newToken: string, newUsername: string, newRole: string) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("username", newUsername);
    localStorage.setItem("role", newRole);

    setToken(newToken);
    setUsername(newUsername);
    setRole(newRole);

    API.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    setToken(null);
    setUsername(null);
    setRole(null);

    delete API.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        role,
        isAuthenticated: Boolean(token),
        isStudent: role === "student",
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}