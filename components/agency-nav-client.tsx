"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/use-notifications"
import { useAutoPresence } from "@/hooks/use-presence"
import { createClient } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"
import { Bell, LogOut, MessageSquare, UserCheck, User, Menu } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"

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
  const supabase = createClient()
  const { unreadMessages, newApplications, totalNotifications, notifications } = useNotifications(
    isVerified ? agencyId : "",
  )
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useAutoPresence()

  const navItems = [
    { href: "/agence/dashboard", label: "Tableau de bord", key: "dashboard" },
    { href: "/agence/mandats", label: "Mandats", key: "mandats", badge: newApplications },
    { href: "/agence/enqueteurs", label: "Enquêteurs", key: "enqueteurs" },
    { href: "/agence/messages", label: "Messages", key: "messages", badge: unreadMessages },
    { href: "/agence/profil", label: "Profil", key: "profil" },
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
                      <Image
                        src="/images/argus-logo.png"
                        alt="Argus"
                        width={120}
                        height={35}
                        className="object-contain"
                      />
                    </div>
                    <nav className="flex-1 p-4 space-y-1">
                      {navItems.map((item) => (
                        <Link key={item.key} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                          <Button
                            variant="ghost"
                            className={`w-full justify-start font-urbanist ${
                              currentPage === item.key
                                ? "bg-[#0f4c75]/10 text-[#0f4c75]"
                                : "text-gray-700 hover:text-[#0f4c75] hover:bg-[#0f4c75]/5"
                            }`}
                          >
                            {item.label}
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="ml-auto bg-[#0f4c75] text-white text-xs h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full font-semibold">
                                {item.badge}
                              </span>
                            )}
                          </Button>
                        </Link>
                      ))}
                    </nav>
                    <div className="p-4 border-t">
                      <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="w-full justify-start text-destructive hover:text-destructive font-urbanist"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Déconnexion
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            <Link href={isVerified ? "/agence/dashboard" : "/agence/profil"} className="flex items-center">
              <Image
                src="/images/argus-logo.png"
                alt="Argus"
                width={140}
                height={40}
                className="object-contain hidden sm:block"
              />
              <Image
                src="/images/argus-logo.png"
                alt="Argus"
                width={100}
                height={30}
                className="object-contain sm:hidden"
              />
            </Link>

            {isVerified && (
              <nav className="hidden lg:flex gap-0.5 xl:gap-1" aria-label="Navigation principale">
                {navItems.map((item) => (
                  <Link key={item.key} href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`relative font-urbanist text-sm px-2 xl:px-3 ${
                        currentPage === item.key
                          ? "bg-[#0f4c75]/10 text-[#0f4c75]"
                          : "text-gray-700 hover:text-[#0f4c75] hover:bg-[#0f4c75]/5"
                      }`}
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
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {isVerified && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative h-9 w-9 p-0 hover:bg-[#0f4c75]/5"
                    aria-label={`Notifications${totalNotifications > 0 ? ` - ${totalNotifications} non lues` : ""}`}
                  >
                    <Bell className="h-5 w-5 text-gray-700" />
                    {totalNotifications > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 bg-[#0f4c75] text-white text-xs h-4 min-w-4 flex items-center justify-center px-1 rounded-full font-semibold text-[10px]"
                        aria-hidden="true"
                      >
                        {totalNotifications > 9 ? "9+" : totalNotifications}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 sm:w-96">
                  <DropdownMenuLabel className="flex items-center justify-between font-urbanist">
                    <span>Notifications</span>
                    {totalNotifications > 0 && (
                      <span className="text-xs font-normal text-gray-500">{totalNotifications} nouvelles</span>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="px-2 py-6 text-center">
                      <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-urbanist text-gray-500">Aucune nouvelle notification</p>
                    </div>
                  ) : (
                    <div className="max-h-80 sm:max-h-96 overflow-y-auto">
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
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-9 px-2 sm:px-3 hover:bg-[#0f4c75]/5 font-urbanist gap-2"
                  aria-label="Menu profil"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {agencyLogoUrl ? (
                      <Image
                        src={agencyLogoUrl || "/placeholder.svg"}
                        alt={agencyName}
                        width={28}
                        height={28}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="hidden md:inline text-sm font-medium truncate max-w-[100px] lg:max-w-[120px]">
                    {agencyName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-urbanist">
                  <p className="font-semibold truncate">{agencyName}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer font-urbanist text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
