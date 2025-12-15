import { createClient } from "@/lib/supabase-server"
import { InvestigatorsTable } from "@/components/admin/investigators-table"

export default async function InvestigatorsPage() {
  const supabase = await createClient()

  const { data: investigators } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_type", "investigator")
    .order("created_at", { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-montserrat font-bold text-foreground">Tous les enquêteurs</h1>
        <p className="text-muted-foreground font-urbanist">Liste complète des enquêteurs inscrits sur la plateforme</p>
      </div>

      <InvestigatorsTable investigators={investigators || []} />
    </div>
  )
}
