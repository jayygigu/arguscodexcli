import { NextRequest, NextResponse } from "next/server"
import { getSupabaseWithAuth } from "@/lib/server-auth"

export async function GET(request: NextRequest) {
  try {
    const { supabase, accessToken } = await getSupabaseWithAuth(request)

    const {
      data: { user },
      error: authError,
    } = accessToken ? await supabase.auth.getUser(accessToken) : await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ user: null, agency: null }, { status: 401 })
    }

    const { data: agencyData, error: agencyError } = await supabase
      .from("agencies")
      .select("id, name, logo, verification_status")
      .eq("owner_id", user.id)
      .maybeSingle()

    if (agencyError) {
      console.error("Error fetching agency:", agencyError)
      return NextResponse.json({ user, agency: null }, { status: 200 })
    }

    return NextResponse.json({ user, agency: agencyData })
  } catch (error: any) {
    console.error("Error in /api/auth/me:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

