import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface DashboardStats {
  mandatesCount: number
  openCount: number
  inProgressCount: number
  completedCount: number
  interestsCount: number
  investigatorsCount: number
  urgentMandatesCount: number
  favoritesCount: number
  unreadMessagesCount: number
}

export interface PendingCandidature {
  id: string
  mandate_id: string
  mandate_title: string
  mandate_city: string
  mandate_date_required: string
  investigator_id: string
  investigator_name: string
  investigator_city: string
  created_at: string
  distance_km: number | null
  urgency_level: "critical" | "urgent" | "normal"
  days_until_required: number | null
  investigator_rating: number
  investigator_completed_mandates: number
}

export interface MandateWithoutCandidature {
  id: string
  title: string
  city: string
  date_required: string
  created_at: string
  hours_since_creation: number
  urgency_level: "critical" | "urgent" | "normal"
}

export interface RecentMandate {
  id: string
  title: string
  status: string
  date_required: string
  is_urgent: boolean
}

export async function getDashboardData(agencyId: string) {
  const supabase = await createServerSupabaseClient()

  const urgencyDate = new Date()
  urgencyDate.setDate(urgencyDate.getDate() + 7)

  const [
    activeMandatesResult,
    openResult,
    inProgressResult,
    completedResult,
    interestsResult,
    allAgenciesResult,
    recentMandatesResult,
    urgentMandatesResult,
    favoritesResult,
    unreadMessagesResult,
    pendingCandidaturesResult,
    mandatesWithoutCandidaturesResult,
  ] = await Promise.all([
    supabase
      .from("mandates")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .in("status", ["open", "in-progress"]),
    supabase
      .from("mandates")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "open"),
    supabase
      .from("mandates")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "in-progress"),
    supabase
      .from("mandates")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "completed"),
    supabase
      .from("mandate_interests")
      .select("mandate_id, mandates!inner(agency_id)", { count: "exact", head: true })
      .eq("mandates.agency_id", agencyId)
      .eq("status", "interested"),
    supabase.from("agencies").select("owner_id"),
    supabase
      .from("mandates")
      .select("id, title, status, date_required")
      .eq("agency_id", agencyId)
      .in("status", ["open", "in-progress"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("mandates")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .in("status", ["open", "in-progress"])
      .lte("date_required", urgencyDate.toISOString()),
    supabase.from("investigator_favorites").select("*", { count: "exact", head: true }).eq("agency_id", agencyId),
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return { count: 0 }
      return supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)
    }),
    supabase
      .from("candidatures_with_details")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("status", "interested")
      .order("days_until_required", { ascending: true, nullsFirst: false })
      .order("distance_km", { ascending: true, nullsFirst: false })
      .limit(10),
    supabase
      .from("mandates")
      .select("id, title, city, date_required, created_at")
      .eq("agency_id", agencyId)
      .eq("status", "open")
      .order("date_required", { ascending: true })
      .limit(5),
  ])

  const agencyOwnerIds = allAgenciesResult.data?.map((a) => a.owner_id).filter(Boolean) || []

  let investigatorsResult
  if (agencyOwnerIds.length > 0) {
    investigatorsResult = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("availability_status", "available")
      .not("id", "in", `(${agencyOwnerIds.join(",")})`)
  } else {
    investigatorsResult = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("availability_status", "available")
  }

  const unreadResult = await unreadMessagesResult

  const stats: DashboardStats = {
    mandatesCount: activeMandatesResult.count || 0,
    openCount: openResult.count || 0,
    inProgressCount: inProgressResult.count || 0,
    completedCount: completedResult.count || 0,
    interestsCount: interestsResult.count || 0,
    investigatorsCount: investigatorsResult.count || 0,
    urgentMandatesCount: urgentMandatesResult.count || 0,
    favoritesCount: favoritesResult.count || 0,
    unreadMessagesCount: unreadResult.count || 0,
  }

  const recentMandates: RecentMandate[] = (recentMandatesResult.data || []).map((mandate) => ({
    ...mandate,
    is_urgent: new Date(mandate.date_required) <= urgencyDate,
  }))

  let pendingCandidatures: PendingCandidature[]

  if (pendingCandidaturesResult.error) {
    // Fallback to original join query if view doesn't exist
    const fallbackResult = await supabase
      .from("mandate_interests")
      .select(`
        id,
        mandate_id,
        investigator_id,
        created_at,
        mandates!inner(title, city, date_required, agency_id, latitude, longitude),
        profiles!inner(name, city, latitude, longitude)
      `)
      .eq("mandates.agency_id", agencyId)
      .eq("status", "interested")
      .order("created_at", { ascending: false })
      .limit(10)

    pendingCandidatures = (fallbackResult.data || []).map((item: any) => {
      const now = new Date()
      const dateRequired = new Date(item.mandates?.date_required)
      const daysUntil = Math.ceil((dateRequired.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      return {
        id: item.id,
        mandate_id: item.mandate_id,
        mandate_title: item.mandates?.title || "Sans titre",
        mandate_city: item.mandates?.city || "Non spécifié",
        mandate_date_required: item.mandates?.date_required,
        investigator_id: item.investigator_id,
        investigator_name: item.profiles?.name || "Enquêteur",
        investigator_city: item.profiles?.city || "Non spécifié",
        created_at: item.created_at,
        distance_km: null,
        urgency_level: daysUntil <= 2 ? "critical" : daysUntil <= 7 ? "urgent" : "normal",
        days_until_required: daysUntil,
        investigator_rating: 0,
        investigator_completed_mandates: 0,
      }
    })
  } else {
    pendingCandidatures = (pendingCandidaturesResult.data || []).map((item: any) => ({
      id: item.id,
      mandate_id: item.mandate_id,
      mandate_title: item.mandate_title || "Sans titre",
      mandate_city: item.mandate_city || "Non spécifié",
      mandate_date_required: item.date_required,
      investigator_id: item.investigator_id,
      investigator_name: item.investigator_name || "Enquêteur",
      investigator_city: item.investigator_city || "Non spécifié",
      created_at: item.created_at,
      distance_km: item.distance_km,
      urgency_level: item.urgency_level || "normal",
      days_until_required: item.days_until_required,
      investigator_rating: item.investigator_rating || 0,
      investigator_completed_mandates: item.investigator_completed_mandates || 0,
    }))
  }

  const mandateIdsWithCandidatures = pendingCandidatures.map((c) => c.mandate_id)
  const now = new Date()
  const mandatesWithoutCandidatures: MandateWithoutCandidature[] = (mandatesWithoutCandidaturesResult.data || [])
    .filter((m: any) => !mandateIdsWithCandidatures.includes(m.id))
    .map((m: any) => {
      const dateRequired = new Date(m.date_required)
      const daysUntil = Math.ceil((dateRequired.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      return {
        id: m.id,
        title: m.title,
        city: m.city || "Non spécifié",
        date_required: m.date_required,
        created_at: m.created_at,
        hours_since_creation: Math.floor((now.getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60)),
        urgency_level: daysUntil <= 2 ? "critical" : daysUntil <= 7 ? "urgent" : "normal",
      }
    })

  return { stats, recentMandates, pendingCandidatures, mandatesWithoutCandidatures }
}
