import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorFallbackProps {
  error: unknown;
  resetError?: () => void;
  eventId?: string;
}

export default function ErrorFallback({
  error,
  resetError,
  eventId,
}: ErrorFallbackProps) {
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  const handleReload = () => {
    if (resetError) {
      resetError();
    }
    window.location.reload();
  };

  const handleGoHome = () => {
    if (resetError) {
      resetError();
    }
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-500">
            An unexpected error occurred. This event has been captured by Sentry
            for our engineering team to investigate.
          </p>
          {eventId && (
            <p className="text-xs font-mono text-slate-400 bg-slate-100 py-1 px-2 rounded inline-block">
              Event ID: {eventId}
            </p>
          )}
        </div>

        {import.meta.env.DEV && (
          <details className="text-left bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
            <summary className="font-semibold text-slate-700 cursor-pointer mb-1">
              Error Details (Dev Only)
            </summary>
            <pre className="text-rose-600 whitespace-pre-wrap break-words font-mono mt-2 max-h-40 overflow-auto">
              {errorMessage}
              {error instanceof Error && error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleReload}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Page</span>
          </button>
          <button
            onClick={handleGoHome}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-medium transition"
          >
            <Home className="w-4 h-4" />
            <span>Go to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}

