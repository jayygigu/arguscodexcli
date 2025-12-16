// Debug logging helper - only logs in development/local environment
const DEBUG_ENDPOINT = "http://127.0.0.1:7242/ingest/25000e01-2f8f-4671-80ec-977a69923072"

const isLocalDev = (): boolean => {
  if (typeof window === "undefined") {
    // Server-side: check if we're in development
    return process.env.NODE_ENV === "development"
  }
  // Client-side: check if we're on localhost
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "0.0.0.0"
  )
}

export function debugLog(location: string, message: string, data: any, hypothesisId?: string) {
  // Only log in local development
  if (!isLocalDev()) {
    return
  }

  try {
    fetch(DEBUG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location,
        message,
        data,
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: hypothesisId || "unknown",
      }),
    }).catch(() => {
      // Silently fail - debug logging should never break the app
    })
  } catch {
    // Silently fail - debug logging should never break the app
  }
}

