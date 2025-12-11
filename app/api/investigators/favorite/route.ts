import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  try {
    const { investigatorId, agencyId } = await request.json()
    const supabase = await createClient()

    const { data: existing, error: checkError } = await supabase
      .from("investigator_favorites")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("investigator_id", investigatorId)
      .maybeSingle()

    if (checkError && checkError.code === "PGRST205") {
      return NextResponse.json(
        {
          success: false,
          error: "Feature not available",
          message:
            "The favorites feature requires database setup. Please run the SQL script: scripts/001_add_investigator_stats.sql",
        },
        { status: 503 },
      )
    }

    if (checkError) {
      console.error("Error checking favorite:", checkError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    if (existing) {
      const { error: deleteError } = await supabase.from("investigator_favorites").delete().eq("id", existing.id)

      if (deleteError) {
        console.error("Error deleting favorite:", deleteError)
        return NextResponse.json({ success: false, error: "Failed to remove favorite" }, { status: 500 })
      }

      revalidatePath("/agence/enqueteurs")
      revalidatePath(`/agence/enqueteurs/${investigatorId}`)
      revalidatePath("/agence/enqueteurs/compare")

      return NextResponse.json({ success: true, isFavorite: false })
    } else {
      const { error: insertError } = await supabase.from("investigator_favorites").insert({
        agency_id: agencyId,
        investigator_id: investigatorId,
      })

      if (insertError) {
        console.error("Error adding favorite:", insertError)
        return NextResponse.json({ success: false, error: "Failed to add favorite" }, { status: 500 })
      }

      revalidatePath("/agence/enqueteurs")
      revalidatePath(`/agence/enqueteurs/${investigatorId}`)
      revalidatePath("/agence/enqueteurs/compare")

      return NextResponse.json({ success: true, isFavorite: true })
    }
  } catch (error) {
    console.error("Error toggling favorite:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
