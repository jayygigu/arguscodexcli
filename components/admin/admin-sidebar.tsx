"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { useState, useEffect } from "react"
import {
  Shield,
  Clock,
  FileText,
  Settings,
  LogOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  LayoutDashboard,
  UserSearch,
  Building2,
} from "lucide-react"
import { createClient } from "@/lib/supabase-browser"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Tableau de bord", href: "/admin", icon: LayoutDashboard, section: "main" },
  // Agencies section
  { name: "Agences en attente", href: "/admin/pending", icon: Clock, section: "agencies" },
  { name: "Agences vérifiées", href: "/admin/verified", icon: CheckCircle, section: "agencies" },
  { name: "Agences rejetées", href: "/admin/rejected", icon: XCircle, section: "agencies" },
  { name: "Re-vérification agences", href: "/admin/reverification", icon: AlertTriangle, section: "agencies" },
  { name: "Toutes les agences", href: "/admin/accounts", icon: Building2, section: "agencies" },
  // Investigators section
  { name: "Enquêteurs en attente", href: "/admin/investigators/pending", icon: Clock, section: "investigators" },
  { name: "Enquêteurs vérifiés", href: "/admin/investigators/verified", icon: CheckCircle, section: "investigators" },
  { name: "Enquêteurs rejetés", href: "/admin/investigators/rejected", icon: XCircle, section: "investigators" },
  { name: "Tous les enquêteurs", href: "/admin/investigators", icon: UserSearch, section: "investigators" },
  // System section
  { name: "Journal d'audit", href: "/admin/logs", icon: FileText, section: "system" },
  { name: "Paramètres", href: "/admin/settings", icon: Settings, section: "system" },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  const [role, setRole] = useState<string>("admin")

  useEffect(() => {
    async function fetchRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from("admin_users").select("role").eq("user_id", user.id).maybeSingle()
        if (data?.role) setRole(data.role)
      }
    }
    fetchRole()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/admin/login"
  }

  const mainItems = navigation.filter((item) => item.section === "main")
  const agencyItems = navigation.filter((item) => item.section === "agencies")
  const investigatorItems = navigation.filter((item) => item.section === "investigators")
  const systemItems = navigation.filter((item) => item.section === "system")

  const renderNavItem = (item: (typeof navigation)[0]) => {
    const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg font-urbanist text-sm transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <item.icon className="w-4 h-4" />
        {item.name}
      </Link>
    )
  }

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-border">
        <Link href="/admin" className="flex items-center gap-3">
          <Image src="/images/argus-logo.png" alt="Argus Admin" width={40} height={40} className="object-contain" />
          <div>
            <h1 className="font-montserrat font-bold text-foreground">Argus</h1>
            <p className="text-xs text-muted-foreground font-urbanist">Administration</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Main */}
        <div className="space-y-1">{mainItems.map(renderNavItem)}</div>

        {/* Agencies Section */}
        <div className="space-y-1">
          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-3 h-3" />
            Agences
          </p>
          {agencyItems.map(renderNavItem)}
        </div>

        {/* Investigators Section */}
        <div className="space-y-1">
          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <UserSearch className="w-3 h-3" />
            Enquêteurs
          </p>
          {investigatorItems.map(renderNavItem)}
        </div>

        {/* System Section */}
        <div className="space-y-1">
          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-3 h-3" />
            Système
          </p>
          {systemItems.map(renderNavItem)}
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-urbanist font-medium text-foreground truncate">Administrateur</p>
            <p className="text-xs text-muted-foreground capitalize">
              {role === "super_admin" ? "Super Admin" : "Admin"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg font-urbanist text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Déconnexion
        </button>
      </div>
    </div>
  )
}
