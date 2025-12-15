import { createClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"
import { AccountDetail } from "@/components/admin/account-detail"

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: agency } = await supabase.from("agencies").select("*").eq("id", id).single()

  if (!agency) {
    notFound()
  }

  const { data: logs } = await supabase
    .from("verification_logs")
    .select("*")
    .eq("agency_id", id)
    .order("created_at", { ascending: false })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <AccountDetail agency={agency} logs={logs || []} currentUserId={user?.id || ""} />
}
