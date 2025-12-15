import { createClient } from "@/lib/supabase-server"
import { InvestigatorDetail } from "@/components/admin/investigator-detail"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function InvestigatorDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) notFound()

  const { data: investigator } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("user_type", "investigator")
    .single()

  if (!investigator) notFound()

  // Get investigator stats
  const { data: stats } = await supabase.from("investigator_stats").select("*").eq("investigator_id", id).maybeSingle()

  return (
    <div className="p-8">
      <InvestigatorDetail investigator={investigator} stats={stats} currentUserId={user.user.id} />
    </div>
  )
}
