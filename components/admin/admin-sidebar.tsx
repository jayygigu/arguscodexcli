"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  Users,
  Shield,
  Clock,
  FileText,
  Settings,
  LogOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  LayoutDashboard,
} from "lucide-react"
import { createClient } from "@/lib/supabase-browser"
import { cn } from "@/lib/utils"

interface AdminSidebarProps {
  adminUser: {
    id: string
    user_id: string
    role: string
    permissions: any
  }
}

const navigation = [
  { name: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
  { name: "Comptes en attente", href: "/admin/pending", icon: Clock },
  { name: "Comptes vérifiés", href: "/admin/verified", icon: CheckCircle },
  { name: "Comptes rejetés", href: "/admin/rejected", icon: XCircle },
  { name: "Re-vérification", href: "/admin/reverification", icon: AlertTriangle },
  { name: "Tous les comptes", href: "/admin/accounts", icon: Users },
  { name: "Journal d'audit", href: "/admin/logs", icon: FileText },
  { name: "Paramètres", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar({ adminUser }: AdminSidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/admin/login"
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

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg font-urbanist text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-urbanist font-medium text-foreground truncate">Administrateur</p>
            <p className="text-xs text-muted-foreground capitalize">
              {adminUser.role === "super_admin" ? "Super Admin" : "Admin"}
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
