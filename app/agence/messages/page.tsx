import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import Link from "next/link"
import { MessageSquare } from "lucide-react"
import { AgencyNav } from "@/components/agency-nav"
import { LoadingState } from "@/components/loading-state"

async function MessagesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/agence/login")
  }

  const { data: agency } = await supabase.from("agencies").select("*").eq("owner_id", user.id).maybeSingle()

  if (!agency) {
    redirect("/agence/dashboard")
  }

  const { data: allMessages } = await supabase
    .from("messages")
    .select("*")
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false })

  const conversationsByInvestigator = (allMessages ?? []).reduce(
    (acc, msg) => {
      const investigatorId = msg.investigator_id

      if (!investigatorId) return acc

      if (!acc[investigatorId]) {
        acc[investigatorId] = {
          investigatorId,
          messages: [],
          lastMessage: msg,
          unreadCount: 0,
        }
      }

      acc[investigatorId].messages.push(msg)

      if (!msg.read && msg.sender_type === "investigator") {
        acc[investigatorId].unreadCount++
      }

      if (new Date(msg.created_at) > new Date(acc[investigatorId].lastMessage.created_at)) {
        acc[investigatorId].lastMessage = msg
      }

      return acc
    },
    {} as Record<string, any>,
  )

  const conversations = Object.values(conversationsByInvestigator)

  const investigatorIds = conversations.map((conv: any) => conv.investigatorId).filter(Boolean)
  const { data: investigatorProfiles } =
    investigatorIds.length > 0
      ? await supabase.from("profiles").select("id, name, is_online, last_seen_at").in("id", investigatorIds)
      : { data: [] }

  const profilesByUserId = (investigatorProfiles ?? []).reduce(
    (acc, profile) => {
      acc[profile.id] = profile
      return acc
    },
    {} as Record<string, any>,
  )

  return (
    <div className="min-h-screen bg-white">
      <AgencyNav currentPage="messages" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-montserrat font-bold text-gray-900">Messages</h1>
          <p className="mt-2 text-gray-600 font-urbanist">Communiquez avec les enquêteurs assignés à vos mandats</p>
        </div>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-montserrat font-medium text-gray-900">Aucune conversation</h3>
            <p className="mt-2 text-gray-500 font-urbanist">
              Assignez des enquêteurs à vos mandats ou envoyez un message direct depuis le registre
            </p>
            <div className="mt-6">
              <Link
                href="/agence/enqueteurs"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-urbanist font-medium text-white bg-[#0f4c75] hover:bg-[#0a3552]"
              >
                Voir les enquêteurs
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {conversations.map((conv: any) => {
                const profile = profilesByUserId[conv.investigatorId]
                const isOnline = profile?.is_online
                const isRecentlyActive =
                  profile?.last_seen_at &&
                  !isOnline &&
                  new Date(profile.last_seen_at) > new Date(Date.now() - 5 * 60 * 1000)

                return (
                  <li key={conv.investigatorId}>
                    <Link
                      href={`/agence/messages/direct/${conv.investigatorId}`}
                      className="block hover:bg-gray-50 transition-colors"
                    >
                      <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 relative">
                                <div className="h-10 w-10 rounded-full bg-[#0f4c75]/10 flex items-center justify-center">
                                  <MessageSquare className="h-5 w-5 text-[#0f4c75]" />
                                </div>
                                <span
                                  className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${
                                    isOnline ? "bg-green-500" : isRecentlyActive ? "bg-yellow-500" : "bg-gray-400"
                                  }`}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-urbanist font-medium text-gray-900 truncate">
                                    {profile?.name || "Enquêteur"}
                                  </p>
                                  {isOnline && (
                                    <span className="text-xs font-urbanist text-green-600 font-medium">En ligne</span>
                                  )}
                                </div>
                                <p className="text-sm font-urbanist text-gray-500 truncate">
                                  {conv.lastMessage.sender_type === "agency" ? "Vous: " : ""}
                                  {conv.lastMessage.content}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {conv.unreadCount > 0 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-urbanist font-medium bg-[#0f4c75]/10 text-[#0f4c75]">
                                {conv.unreadCount}
                              </span>
                            )}
                            <div className="text-xs font-urbanist text-gray-500">
                              {new Date(conv.lastMessage.created_at).toLocaleDateString("fr-CA", {
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="Chargement des messages..." />}>
      <MessagesPage />
    </Suspense>
  )
}
