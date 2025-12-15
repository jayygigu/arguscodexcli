import type React from "react"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  // Check if user is admin
  const { data: adminUser } = await supabase.from("admin_users").select("*").eq("user_id", user.id).single()

  if (!adminUser) {
    redirect("/admin/login?error=unauthorized")
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar adminUser={adminUser} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
