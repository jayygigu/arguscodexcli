import { type NextRequest } from "next/server"
import { createClient } from "./supabase-server"

export async function getSupabaseWithAuth(request: NextRequest) {
  const supabase = await createClient()
  const authHeader = request.headers.get("authorization") || ""
  const accessToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null
  const refreshToken = request.headers.get("x-refresh-token")

  if (accessToken && refreshToken) {
    try {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
    } catch (err) {
      console.warn("[getSupabaseWithAuth] setSession failed", err)
    }
  }

  return { supabase, accessToken }
}

