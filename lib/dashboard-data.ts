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

  const now = new Date()
  const recentMandates: RecentMandate[] = (recentMandatesResult.data || []).map((mandate) => ({
    ...mandate,
    is_urgent: new Date(mandate.date_required) <= urgencyDate,
  }))

  return { stats, recentMandates }
}
