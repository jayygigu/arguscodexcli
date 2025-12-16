import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

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

