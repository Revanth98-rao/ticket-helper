import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, getTrustedOrigins } from "../auth";

export interface AuthenticatedRequest extends Request {
  user?: typeof auth.$Infer.Session.user;
  session?: typeof auth.$Infer.Session.session;
}

export { getTrustedOrigins };

/**
 * Middleware to protect routes and verify active database session.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: "Unauthorized: Active session required" });
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch (error) {
    return res.status(500).json({ error: "Failed to authenticate session" });
  }
}

/**
 * Middleware to enforce role-based access control (RBAC).
 * Must be mounted after requireAuth.
 */
export function requireRole(allowedRoles: ("admin" | "agent")[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: Active session required" });
    }

    const userRole = ((req.user as any)?.role || "agent") as "admin" | "agent";

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: "Forbidden: Insufficient privileges",
        requiredRoles: allowedRoles,
        currentRole: userRole,
      });
    }

    next();
  };
}
