import { createClient } from "@/lib/supabase-server"
import { AdminSettings } from "@/components/admin/admin-settings"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: adminUser } = await supabase.from("admin_users").select("*").eq("user_id", user?.id).single()

  const { data: allAdmins } = await supabase.from("admin_users").select("*").order("created_at", { ascending: true })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-montserrat font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground font-urbanist mt-1">Configuration de l'administration</p>
      </div>

      <AdminSettings currentAdmin={adminUser} allAdmins={allAdmins || []} currentUserId={user?.id || ""} />
    </div>
  )
}
