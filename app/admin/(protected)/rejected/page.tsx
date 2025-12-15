import { createClient } from "@/lib/supabase-server"
import { AccountsTable } from "@/components/admin/accounts-table"

export default async function RejectedAccountsPage() {
  const supabase = await createClient()

  const { data: agencies } = await supabase
    .from("agencies")
    .select("*")
    .eq("verification_status", "rejected")
    .order("updated_at", { ascending: false })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-montserrat font-bold text-foreground">Comptes rejetés</h1>
        <p className="text-muted-foreground font-urbanist mt-1">
          {agencies?.length || 0} compte{(agencies?.length || 0) !== 1 ? "s" : ""} rejeté
          {(agencies?.length || 0) !== 1 ? "s" : ""}
        </p>
      </div>

      <AccountsTable agencies={agencies || []} defaultFilter="rejected" />
    </div>
  )
}
