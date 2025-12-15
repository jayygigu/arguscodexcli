import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { investigatorId, mandateId, mandateTitle } = await request.json()

    if (!investigatorId || !mandateId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get agency info from mandate
    const { data: mandate } = await supabase
      .from("mandates")
      .select("agency_id, agencies(name)")
      .eq("id", mandateId)
      .single()

    const agencyName = (mandate?.agencies as any)?.name || "Une agence"

    // Create notification for investigator
    const { error } = await supabase.from("notifications").insert({
      user_id: investigatorId,
      type: "mandate_assigned",
      title: "Nouveau mandat attribué",
      message: `L'agence ${agencyName} vous a attribué le mandat: ${mandateTitle}`,
      data: { mandate_id: mandateId, agency_name: agencyName },
      read: false,
    })

    if (error) {
      console.error("Error creating notification:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Notification API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
