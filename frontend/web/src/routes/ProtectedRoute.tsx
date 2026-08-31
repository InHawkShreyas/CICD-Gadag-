import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  // Role strings must match what getMenuByRole in layoutConfig.ts expects:
  // "student" | "admin" | "document-admin" | "sysadmin"
  allowedRoles: string[];
  redirectPath?: string;
}

export default function ProtectedRoute({
  allowedRoles,
  redirectPath = "/login",
}: ProtectedRouteProps) {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  const isAllowed = allowedRoles.includes((role ?? "").toLowerCase());

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}