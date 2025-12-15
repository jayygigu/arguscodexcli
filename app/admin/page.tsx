import { createClient } from "@/lib/supabase-server"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  const supabase = await createClient()

  // Fetch stats
  const [
    { count: pendingCount },
    { count: verifiedCount },
    { count: rejectedCount },
    { count: expiredCount },
    { count: reverificationCount },
    { data: recentLogs },
  ] = await Promise.all([
    supabase.from("agencies").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
    supabase.from("agencies").select("*", { count: "exact", head: true }).eq("verification_status", "verified"),
    supabase.from("agencies").select("*", { count: "exact", head: true }).eq("verification_status", "rejected"),
    supabase.from("agencies").select("*", { count: "exact", head: true }).eq("verification_status", "expired"),
    supabase.from("agencies").select("*", { count: "exact", head: true }).eq("re_verification_required", true),
    supabase.from("verification_logs").select("*, agencies(name)").order("created_at", { ascending: false }).limit(10),
  ])

  // Fetch agencies needing attention
  const { data: pendingAgencies } = await supabase
    .from("agencies")
    .select("*")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true })
    .limit(5)

  // Fetch upcoming expirations
  const { data: expiringAgencies } = await supabase
    .from("agencies")
    .select("*")
    .eq("verification_status", "verified")
    .not("permit_expiration_date", "is", null)
    .lte("permit_expiration_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .order("permit_expiration_date", { ascending: true })
    .limit(5)

  return (
    <AdminDashboard
      stats={{
        pending: pendingCount || 0,
        verified: verifiedCount || 0,
        rejected: rejectedCount || 0,
        expired: expiredCount || 0,
        reverification: reverificationCount || 0,
      }}
      pendingAgencies={pendingAgencies || []}
      expiringAgencies={expiringAgencies || []}
      recentLogs={recentLogs || []}
    />
  )
}
