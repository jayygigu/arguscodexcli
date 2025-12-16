import { createClient } from "@/lib/supabase-server"
import { InvestigatorsTable } from "@/components/admin/investigators-table"

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function VerifiedInvestigatorsPage() {
  const supabase = await createClient()

  const { data: investigators } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_type", "investigator")
    .eq("verification_status", "verified")
    .order("verified_at", { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-montserrat font-bold text-foreground">Enquêteurs vérifiés</h1>
        <p className="text-muted-foreground font-urbanist">Enquêteurs dont le permis a été vérifié et validé</p>
      </div>

      <InvestigatorsTable investigators={investigators || []} />
    </div>
  )
}
