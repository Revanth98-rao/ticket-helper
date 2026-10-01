import React from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "agent")[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { data: session, isPending } = useSession();

  // Layer 0: Loading verification state
  if (isPending) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground">
          Verifying session...
        </span>
      </div>
    );
  }

  // Layer 1: Authentication protection
  // If unauthenticated, redirect immediately to /login
  if (!session?.user) {
    return <Navigate to="/login" replace />;
  }

  // Layer 2: Role authorization protection
  // If authenticated but role is not permitted (e.g. non-admin accessing admin-only page),
  // redirect immediately to "/"
  const userRole = ((session.user as any)?.role || "agent") as
    | "admin"
    | "agent";

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
