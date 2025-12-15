import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const redirectTo = searchParams.get("redirect") || "/agence/login"

  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL(redirectTo, request.url))
}
