"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/use-notifications"
import { useAutoPresence } from "@/hooks/use-presence"
import { createClient } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"
import { Bell, LogOut, MessageSquare, UserCheck } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AgencyNavClientProps {
  currentPage?: string
  agencyId: string
  agencyName: string
}

export function AgencyNavClient({ currentPage, agencyId, agencyName }: AgencyNavClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { unreadMessages, newApplications, totalNotifications, notifications } = useNotifications(agencyId)

  useAutoPresence()

  const navItems = [
    { href: "/agence/dashboard", label: "Tableau de bord", key: "dashboard" },
    { href: "/agence/mandats", label: "Mandats", key: "mandats", badge: newApplications },
    { href: "/agence/enqueteurs", label: "Enquêteurs", key: "enqueteurs" },
    { href: "/agence/messages", label: "Messages", key: "messages", badge: unreadMessages },
  ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/agence/login")
  }

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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-8">
            <Link href="/agence/dashboard" className="flex items-center gap-3">
              <Image src="/images/argus-logo.png" alt="Argus" width={180} height={180} className="object-contain" />
            </Link>
            <nav className="hidden lg:flex gap-1" aria-label="Navigation principale">
              {navItems.map((item) => (
                <Link key={item.key} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`relative font-urbanist ${currentPage === item.key ? "bg-[#0f4c75]/10 text-[#0f4c75]" : "text-gray-700 hover:text-[#0f4c75] hover:bg-[#0f4c75]/5"}`}
                    aria-current={currentPage === item.key ? "page" : undefined}
                  >
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className="absolute -top-1 -right-1 bg-[#0f4c75] text-white text-xs h-5 min-w-5 flex items-center justify-center px-1 rounded-full font-semibold"
                        aria-label={`${item.badge} ${item.key === "messages" ? "messages non lus" : "nouvelles candidatures"}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-10 w-10 p-0 hover:bg-[#0f4c75]/5"
                  aria-label={`Notifications${totalNotifications > 0 ? ` - ${totalNotifications} non lues` : ""}`}
                >
                  <Bell className="h-5 w-5 text-gray-700" />
                  {totalNotifications > 0 && (
                    <span
                      className="absolute -top-1 -right-1 bg-[#0f4c75] text-white text-xs h-5 min-w-5 flex items-center justify-center px-1 rounded-full font-semibold"
                      aria-hidden="true"
                    >
                      {totalNotifications}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96">
                <DropdownMenuLabel className="flex items-center justify-between font-urbanist">
                  <span>Notifications</span>
                  {totalNotifications > 0 && (
                    <span className="text-xs font-normal text-gray-500">{totalNotifications} nouvelles</span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="px-2 py-8 text-center">
                    <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-urbanist text-gray-500">Aucune nouvelle notification</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <DropdownMenuItem key={notification.id} asChild className="cursor-pointer">
                        <Link href={notification.link} className="flex items-start gap-3 p-3 hover:bg-gray-50">
                          <div className="flex-shrink-0 mt-1">
                            {notification.type === "message" ? (
                              <div className="h-8 w-8 rounded-full bg-[#0f4c75]/10 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-[#0f4c75]" />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                <UserCheck className="h-4 w-4 text-green-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-urbanist font-semibold text-gray-900 leading-tight mb-1">
                              {notification.title}
                            </p>
                            <p className="text-xs font-urbanist text-gray-600 leading-tight mb-1 line-clamp-2">
                              {notification.description}
                            </p>
                            <p className="text-xs font-urbanist text-gray-500">
                              {formatRelativeTime(notification.timestamp)}
                            </p>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                      <Link
                        href="/agence/notifications"
                        className="block text-center text-sm font-urbanist text-[#0f4c75] hover:text-[#0a3552] font-semibold"
                      >
                        Voir toutes les notifications
                      </Link>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="gap-2 border-gray-300 hover:bg-[#0f4c75]/5 hover:text-[#0f4c75] font-urbanist bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>

        <nav className="lg:hidden pb-3 flex gap-1 overflow-x-auto" aria-label="Navigation mobile">
          {navItems.map((item) => (
            <Link key={item.key} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={`relative whitespace-nowrap font-urbanist ${currentPage === item.key ? "bg-[#0f4c75]/10 text-[#0f4c75]" : "text-gray-700"}`}
                aria-current={currentPage === item.key ? "page" : undefined}
              >
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="absolute -top-1 -right-1 bg-[#0f4c75] text-white text-xs h-5 min-w-5 flex items-center justify-center px-1 rounded-full"
                    aria-label={`${item.badge} ${item.key === "messages" ? "messages non lus" : "nouvelles candidatures"}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Button>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
