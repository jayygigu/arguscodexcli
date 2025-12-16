// Client-side helper to attach Supabase session tokens to API requests
export async function buildAuthHeaders(base: Record<string, string> = {}) {
  const headers: Record<string, string> = { ...base }

  try {
    const { createClientAsync } = await import("./supabase-browser")
    const supabase = await createClientAsync()
    if (!supabase?.auth) {
      throw new Error("Supabase client missing auth")
    }
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    const refreshToken = data.session?.refresh_token

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }
    if (refreshToken) {
      headers["X-Refresh-Token"] = refreshToken
    }
  } catch (err) {
    // Fallback silently when session isn't available
    console.warn("[buildAuthHeaders] Unable to attach auth tokens", err)
  }

  return headers
}
