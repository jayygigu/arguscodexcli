import { createClient } from "@/lib/supabase-server"

export interface InvestigatorWithStats {
  id: string
  name: string
  license_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  region: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  years_experience: number | null
  availability_status: "available" | "busy" | "unavailable" | null
  radius: number | null
  created_at: string | null
  updated_at: string | null
  stats?: {
    total_mandates_completed: number
    total_mandates_in_progress: number
    average_rating: number | null
    total_ratings: number
    completion_rate: number | null
    on_time_rate: number | null
    last_mandate_date: string | null
  } | null
  is_favorite?: boolean
  favorite_notes?: string | null
  specialties?: string[]
}

export async function getInvestigatorWithStats(investigatorId: string, agencyId?: string) {
  const supabase = await createClient()

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", investigatorId)
    .single()

  if (profileError || !profile) {
    return null
  }

  const { data: stats } = await supabase
    .from("investigator_stats")
    .select("*")
    .eq("investigator_id", investigatorId)
    .single()

  const { data: specialties } = await supabase
    .from("profile_specialties")
    .select("specialty")
    .eq("profile_id", investigatorId)

  let isFavorite = false
  let favoriteNotes = null
  if (agencyId) {
    const { data: favorite } = await supabase
      .from("investigator_favorites")
      .select("notes")
      .eq("agency_id", agencyId)
      .eq("investigator_id", investigatorId)
      .single()

    if (favorite) {
      isFavorite = true
      favoriteNotes = favorite.notes
    }
  }

  return {
    ...profile,
    stats: stats
      ? {
          total_mandates_completed: stats.total_mandates_completed || 0,
          total_mandates_in_progress: stats.total_mandates_in_progress || 0,
          average_rating: stats.average_rating,
          total_ratings: stats.total_ratings || 0,
          completion_rate: stats.completion_rate ?? null,
          on_time_rate: stats.on_time_rate ?? null,
          last_mandate_date: stats.last_mandate_date,
        }
      : null,
    is_favorite: isFavorite,
    favorite_notes: favoriteNotes,
    specialties: specialties?.map((s) => s.specialty) || [],
  } as InvestigatorWithStats
}

export async function toggleFavorite(agencyId: string, investigatorId: string, notes?: string) {
  const supabase = await createClient()

  // Check if already favorite
  const { data: existing } = await supabase
    .from("investigator_favorites")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("investigator_id", investigatorId)
    .single()

  if (existing) {
    // Remove from favorites
    const { error } = await supabase.from("investigator_favorites").delete().eq("id", existing.id)

    return { isFavorite: false, error }
  } else {
    // Add to favorites
    const { error } = await supabase.from("investigator_favorites").insert({
      agency_id: agencyId,
      investigator_id: investigatorId,
      notes: notes || null,
    })

    return { isFavorite: true, error }
  }
}

export async function getCollaborationHistory(agencyId: string, investigatorId: string) {
  const supabase = await createClient()

  const { data: mandates, error } = await supabase
    .from("mandates")
    .select(`
      id,
      title,
      status,
      created_at,
      updated_at,
      mandate_ratings(rating, comment, on_time)
    `)
    .eq("agency_id", agencyId)
    .eq("assigned_to", investigatorId)
    .order("created_at", { ascending: false })

  if (error) return null

  const completed = mandates?.filter((m) => m.status === "completed") || []
  const inProgress = mandates?.filter((m) => m.status === "in-progress") || []

  return {
    total_mandates: mandates?.length || 0,
    completed_mandates: completed.length,
    in_progress_mandates: inProgress.length,
    last_collaboration: mandates?.[0]?.created_at || null,
    mandates: mandates || [],
  }
}
