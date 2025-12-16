"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/use-notifications"
import { useAutoPresence } from "@/hooks/use-presence"
import { useSupabaseClient } from "@/hooks/use-supabase-client"
import { useRouter } from "next/navigation"
import { Bell, LogOut, MessageSquare, UserCheck, User, Menu, FileText } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState, useCallback, useEffect } from "react"

interface AgencyNavClientProps {
  currentPage?: string
  agencyId: string
  agencyName: string
  agencyLogoUrl?: string | null
  isVerified?: boolean
}

export function AgencyNavClient({
  currentPage,
  agencyId,
  agencyName,
  agencyLogoUrl,
  isVerified = false,
}: AgencyNavClientProps) {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Only use hooks that require Supabase after mount
  const { unreadMessages, newApplications, totalNotifications, notifications } = useNotifications(
    mounted && isVerified && supabase ? agencyId : "",
  )

  // Only call useAutoPresence after mount and when supabase is available
  useEffect(() => {
    setMounted(true)
  }, [])

  // Call useAutoPresence hook - it handles supabase null check internally
  useAutoPresence()

  const navItems = [
    { href: "/agence/dashboard", label: "Tableau de bord", key: "dashboard" },
    { href: "/agence/mandats", label: "Mandats", key: "mandats", badge: newApplications },
    { href: "/agence/enqueteurs", label: "Enquêteurs", key: "enqueteurs" },
    { href: "/agence/messages", label: "Messages", key: "messages", badge: unreadMessages },
    { href: "/agence/profil", label: "Profil", key: "profil" },
  ]

  const handleSignOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push("/agence/login")
  }, [router, supabase])

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "À l'instant"
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)} h`
    return `Il y a ${Math.floor(diffInMinutes / 1440)} j`
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-8">
            {isVerified && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden h-9 w-9 p-0">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b">
                      <div className="flex items-center gap-3">
                        {agencyLogoUrl ? (
                          <Image
                            src={agencyLogoUrl}
                            alt={agencyName}
                            width={40}
                            height={40}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-lg font-semibold text-primary-foreground">
                              {agencyName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm">{agencyName}</p>
                          <p className="text-xs text-muted-foreground">Agence vérifiée</p>
                        </div>
                      </div>
                    </div>
                    <nav className="flex-1 p-4 space-y-2">
                      {navItems.map((item) => (
                        <Link
                          key={item.key}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            currentPage === item.key
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {item.key === "dashboard" && <User className="h-4 w-4" />}
                          {item.key === "mandats" && <FileText className="h-4 w-4" />}
                          {item.key === "enqueteurs" && <UserCheck className="h-4 w-4" />}
                          {item.key === "messages" && <MessageSquare className="h-4 w-4" />}
                          {item.key === "profil" && <User className="h-4 w-4" />}
                          <span>{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                    </nav>
                    <div className="p-4 border-t">
                      <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Déconnexion
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            <Link href="/agence/dashboard" className="flex items-center gap-2 sm:gap-3">
              {agencyLogoUrl ? (
                <Image
                  src={agencyLogoUrl}
                  alt={agencyName}
                  width={32}
                  height={32}
                  className="rounded-lg object-cover hidden sm:block"
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center hidden sm:flex">
                  <span className="text-sm font-semibold text-primary-foreground">
                    {agencyName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="font-semibold text-sm sm:text-base hidden sm:inline">{agencyName}</span>
            </Link>

            {isVerified && (
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                      currentPage === item.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {isVerified && (
            <div className="flex items-center gap-2 sm:gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
                    <Bell className="h-5 w-5" />
                    {totalNotifications > 0 && (
                      <span className="absolute top-0 right-0 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                        {totalNotifications > 9 ? "9+" : totalNotifications}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications récentes</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications && notifications.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.slice(0, 10).map((notification: any) => (
                        <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3">
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="text-sm font-medium">{notification.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(notification.created_at)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground line-clamp-2">{notification.message}</span>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">Aucune notification</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
                    {agencyLogoUrl ? (
                      <Image
                        src={agencyLogoUrl}
                        alt={agencyName}
                        width={36}
                        height={36}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary-foreground">
                          {agencyName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{agencyName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
