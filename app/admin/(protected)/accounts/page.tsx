import { createClient } from "@/lib/supabase-server"
import { AccountsTable } from "@/components/admin/accounts-table"

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function AccountsPage() {
  const supabase = await createClient()

  const { data: agencies } = await supabase.from("agencies").select("*").order("created_at", { ascending: false })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-montserrat font-bold text-foreground">Tous les comptes</h1>
        <p className="text-muted-foreground font-urbanist mt-1">Gérez tous les comptes agences de la plateforme</p>
      </div>

      <AccountsTable agencies={agencies || []} />
    </div>
  )
}
