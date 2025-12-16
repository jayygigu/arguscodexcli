import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      type,
      description,
      city,
      region,
      postal_code,
      date_required,
      duration,
      priority,
      budget,
      agency_id,
      assignment_type,
      assigned_to,
      status,
      latitude,
      longitude,
    } = body

    // Validate required fields
    if (!title || !type || !description || !city || !region || !postal_code || !date_required || !duration || !priority || !agency_id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify agency belongs to user
    const { data: agency } = await supabase.from("agencies").select("id").eq("id", agency_id).eq("owner_id", user.id).single()

    if (!agency) {
      return NextResponse.json({ error: "Agency not found or access denied" }, { status: 403 })
    }

    const mandateData = {
      title,
      type,
      description,
      city,
      region,
      postal_code,
      date_required,
      duration,
      priority,
      budget: budget || null,
      agency_id,
      assignment_type: assignment_type || "public",
      assigned_to: assigned_to || null,
      status,
      latitude: latitude || 0,
      longitude: longitude || 0,
    }

    const { data, error } = await supabase.from("mandates").insert(mandateData).select().single()

    if (error) {
      console.error("Error creating mandate:", error)
      return NextResponse.json({ error: error.message || "Erreur lors de la création du mandat" }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Aucune donnée retournée après la création du mandat" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in /api/mandates/create:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

