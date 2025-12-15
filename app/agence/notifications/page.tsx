import { createServerSupabaseClient } from "@/lib/supabase-server"
import { AgencyNav } from "@/components/agency-nav"
import { Bell, MessageSquare, UserCheck, CheckCircle2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { markNotificationAsReadAction, deleteNotificationAction } from "@/actions/notification-actions"
import { getVerifiedAgencyAuth } from "@/lib/agency-auth"

export default async function NotificationsPage() {
  const { user, agency } = await getVerifiedAgencyAuth()
  const supabase = await createServerSupabaseClient()

  const { data: systemNotifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: unreadMessages } = await supabase
    .from("messages")
    .select("*, profiles:investigator_id(id, name)")
    .eq("agency_id", agency.id)
    .eq("read", false)
    .eq("sender_type", "investigator")
    .order("created_at", { ascending: false })

  const { data: newApplications } = await supabase
    .from("mandate_interests")
    .select(
      `
      *,
      mandates!inner(id, title, agency_id),
      profiles:investigator_id(id, name)
    `,
    )
    .eq("mandates.agency_id", agency.id)
    .eq("status", "interested")
    .order("created_at", { ascending: false })

  const allNotifications = [
    ...(systemNotifications || []).map((n) => ({
      ...n,
      type: "system" as const,
      link: n.mandate_id ? `/agence/mandats/${n.mandate_id}` : "/agence/dashboard",
    })),
    ...(unreadMessages || []).map((m) => ({
      ...m,
      type: "message" as const,
      title: `Message de ${m.profiles?.name || "Enquêteur"}`,
      message: m.content,
      link: `/agence/messages/direct/${m.investigator_id}`,
    })),
    ...(newApplications || []).map((a: any) => ({
      ...a,
      type: "application" as const,
      title: `Nouvelle candidature de ${a.profiles?.name || "Enquêteur"}`,
      message: `Pour le mandat: ${a.mandates?.title}`,
      link: "/agence/candidatures",
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const unreadCount = allNotifications.filter((n) => !n.read).length

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
    <div className="min-h-screen bg-gray-50">
      <AgencyNav currentPage="notifications" />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-montserrat font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-sm font-urbanist text-gray-600">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Toutes les notifications sont lues"}
          </p>
        </div>

        {allNotifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-montserrat font-semibold text-gray-900 mb-2">Aucune notification</h3>
            <p className="text-sm font-urbanist text-gray-600">Vous n'avez pas encore de notifications.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow ${!notification.read ? "border-l-4 border-l-[#0f4c75]" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {notification.type === "message" && (
                      <div className="h-10 w-10 rounded-full bg-[#0f4c75]/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-[#0f4c75]" />
                      </div>
                    )}
                    {notification.type === "application" && (
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                    {notification.type === "system" && (
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-urbanist font-semibold text-gray-900">{notification.title}</p>
                      {!notification.read && (
                        <span className="ml-2 flex-shrink-0 h-2 w-2 bg-[#0f4c75] rounded-full" aria-label="Non lu" />
                      )}
                    </div>
                    <p className="text-sm font-urbanist text-gray-600 mb-2">{notification.message}</p>
                    <p className="text-xs font-urbanist text-gray-500 mb-3">
                      {formatRelativeTime(notification.created_at)}
                    </p>

                    <div className="flex gap-2">
                      <Link href={notification.link}>
                        <Button size="sm" variant="outline" className="text-xs bg-transparent">
                          Voir
                        </Button>
                      </Link>
                      {notification.type === "system" && !notification.read && (
                        <form action={markNotificationAsReadAction}>
                          <input type="hidden" name="notificationId" value={notification.id} />
                          <Button type="submit" size="sm" variant="ghost" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Marquer comme lu
                          </Button>
                        </form>
                      )}
                      {notification.type === "system" && (
                        <form action={deleteNotificationAction}>
                          <input type="hidden" name="notificationId" value={notification.id} />
                          <Button type="submit" size="sm" variant="ghost" className="text-xs text-red-600">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Supprimer
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
