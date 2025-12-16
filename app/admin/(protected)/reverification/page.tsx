import { createClient } from "@/lib/supabase-server"
import { ReverificationList } from "@/components/admin/reverification-list"

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function ReverificationPage() {
  const supabase = await createClient()

  // Get agencies needing re-verification
  const { data: agencies } = await supabase
    .from("agencies")
    .select("*")
    .or("re_verification_required.eq.true,verification_status.eq.expired")
    .order("permit_expiration_date", { ascending: true })

  // Get upcoming alerts
  const { data: alerts } = await supabase
    .from("re_verification_alerts")
    .select("*, agencies(name, license_number, permit_expiration_date)")
    .eq("is_sent", false)
    .lte("alert_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .order("alert_date", { ascending: true })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-montserrat font-bold text-foreground">Re-vérification</h1>
        <p className="text-muted-foreground font-urbanist mt-1">
          Comptes nécessitant une re-vérification de leur permis
        </p>
      </div>

      <ReverificationList agencies={agencies || []} alerts={alerts || []} />
    </div>
  )
}
