import { createClient } from "@/lib/supabase-server"
import { InvestigatorsTable } from "@/components/admin/investigators-table"

export default async function PendingInvestigatorsPage() {
  const supabase = await createClient()

  const { data: investigators } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_type", "investigator")
    .eq("verification_status", "pending")
    .not("license_number", "is", null)
    .order("created_at", { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-montserrat font-bold text-foreground">Enquêteurs en attente</h1>
        <p className="text-muted-foreground font-urbanist">Enquêteurs avec permis en attente de vérification</p>
      </div>

      <InvestigatorsTable investigators={investigators || []} />
    </div>
  )
}
