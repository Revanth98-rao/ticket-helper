import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";

export interface AuthenticatedRequest extends Request {
  user?: typeof auth.$Infer.Session.user;
  session?: typeof auth.$Infer.Session.session;
}

/**
 * Returns trusted origins parsed from environment variables (BETTER_AUTH_TRUSTED_ORIGINS or CLIENT_URL).
 * Eliminates any hardcoded origins in code.
 */
export function getTrustedOrigins(): string[] {
  const envOrigins =
    process.env.BETTER_AUTH_TRUSTED_ORIGINS || process.env.CLIENT_URL;

  if (!envOrigins) {
    return [];
  }

  return envOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

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
