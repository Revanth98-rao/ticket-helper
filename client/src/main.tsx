import "./instrument";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { queryClient } from "./lib/query-client";
import App from "./App";
import ErrorFallback from "./components/ErrorFallback";
import "./index.css";

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Sentry.ErrorBoundary
        fallback={({ error, resetError, eventId }) => (
          <ErrorFallback
            error={error}
            resetError={resetError}
            eventId={eventId}
          />
        )}
      >
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </Sentry.ErrorBoundary>
    </React.StrictMode>
  );
}
