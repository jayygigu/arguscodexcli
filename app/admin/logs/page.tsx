import { createClient } from "@/lib/supabase-server"
import { AuditLogs } from "@/components/admin/audit-logs"

export default async function LogsPage() {
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from("verification_logs")
    .select("*, agencies(name)")
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-montserrat font-bold text-foreground">Journal d'audit</h1>
        <p className="text-muted-foreground font-urbanist mt-1">Historique de toutes les actions de vérification</p>
      </div>

      <AuditLogs logs={logs || []} />
    </div>
  )
}
