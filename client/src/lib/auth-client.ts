import { createAuthClient } from "better-auth/react";

const rawBaseURL = import.meta.env.VITE_AUTH_URL;
const resolvedClientBaseURL = rawBaseURL
  ? (rawBaseURL.startsWith("http://") || rawBaseURL.startsWith("https://")
      ? rawBaseURL
      : `https://${rawBaseURL}`)
  : typeof window !== "undefined"
  ? window.location.origin
  : "http://localhost:5000";

export const authClient = createAuthClient({
  baseURL: resolvedClientBaseURL,
});

export const { signIn, signOut, useSession } = authClient;

