"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSupabaseClient } from "@/hooks/use-supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Send, Check, CheckCheck, User, Briefcase } from "lucide-react"
import { usePresence } from "@/hooks/use-presence"
import { AgencyNav } from "@/components/agency-nav"
import { Breadcrumb } from "@/components/breadcrumb"
import Link from "@/components/safe-link"
import { useAgencyAuth } from "@/hooks/use-agency-auth"

export default function DirectMessagePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useSupabaseClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const investigatorId = params.investigatorId as string

  const { agency: authAgency, user: authUser, loading: authLoading } = useAgencyAuth({ requireVerified: true })

  const [investigator, setInvestigator] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [messageText, setMessageText] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
  const hasScrolledToBottomOnLoad = useRef(false)
  const [relatedMandates, setRelatedMandates] = useState<any[]>([])

  const { isOnline, statusText } = usePresence(investigatorId)

  useEffect(() => {
    if (authAgency) {
      loadData()
    }
  }, [investigatorId, authAgency])

  useEffect(() => {
    if (messages.length > 0 && !hasScrolledToBottomOnLoad.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" })
      hasScrolledToBottomOnLoad.current = true
    }
  }, [messages.length])

  useEffect(() => {
    if (!userHasScrolledUp && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, userHasScrolledUp])

  useEffect(() => {
    if (messages.length > 0 && authAgency) {
      const unreadMessages = messages.filter((m) => !m.read && m.sender_type === "investigator")
      if (unreadMessages.length > 0) {
        markMessagesAsRead(unreadMessages.map((m) => m.id))
      }
    }
  }, [messages, authAgency])

  useEffect(() => {
    if (!authAgency?.id || !investigatorId) return

    const channel = supabase
      .channel(`messages:${authAgency.id}:${investigatorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `agency_id=eq.${authAgency.id}`,
        },
        (payload) => {
          if (payload.new.investigator_id === investigatorId) {
            setMessages((prev) => [...prev, payload.new])
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `agency_id=eq.${authAgency.id}`,
        },
        (payload) => {
          if (payload.new.investigator_id === investigatorId) {
            setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [authAgency?.id, investigatorId, supabase])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const { data: investigatorData, error: investigatorError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", investigatorId)
        .single()

      if (investigatorError) {
        setError("Erreur lors du chargement de l'enquêteur.")
        return
      }

      if (!investigatorData) {
        router.push("/agence/enqueteurs")
        return
      }

      setInvestigator(investigatorData)

      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("agency_id", authAgency.id)
        .eq("investigator_id", investigatorId)
        .order("created_at", { ascending: true })

      if (messagesError) {
        setError("Erreur lors du chargement des messages.")
        return
      }

      setMessages(messagesData || [])

      const { data: mandatesData } = await supabase
        .from("mandates")
        .select("id, title, status")
        .eq("agency_id", authAgency.id)
        .or(`assigned_to.eq.${investigatorId}`)
        .order("created_at", { ascending: false })
        .limit(5)

      setRelatedMandates(mandatesData || [])

      setLoading(false)
    } catch (err) {
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.")
      setLoading(false)
    }
  }

  async function markMessagesAsRead(messageIds: string[]) {
    if (messageIds.length === 0) return

    const { error } = await supabase
      .from("messages")
      .update({ read: true, read_at: new Date().toISOString() })
      .in("id", messageIds)

    if (!error) {
      setMessages((prev) =>
        prev.map((m) => (messageIds.includes(m.id) ? { ...m, read: true, read_at: new Date().toISOString() } : m)),
      )
    }
  }

  async function handleSendMessage() {
    if (!messageText.trim() || !authUser || !authAgency) return

    setIsSending(true)

    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      agency_id: authAgency.id,
      investigator_id: investigatorId,
      sender_type: "agency",
      sender_id: authUser.id,
      content: messageText.trim(),
      read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setMessageText("")
    setUserHasScrolledUp(false)

    const { data, error } = await supabase
      .from("messages")
      .insert({
        agency_id: authAgency.id,
        investigator_id: investigatorId,
        sender_type: "agency",
        sender_id: authUser.id,
        content: messageText.trim(),
      })
      .select()
      .single()

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
      setMessageText(messageText.trim())
    } else {
      setMessages((prev) => prev.map((m) => (m.id === optimisticMessage.id ? data : m)))
    }

    setIsSending(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AgencyNav currentPage="messages" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!authAgency) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AgencyNav currentPage="messages" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4">
          <Breadcrumb
            items={[
              { label: "Tableau de bord", href: "/agence/dashboard" },
              { label: "Messages", href: "/agence/messages" },
              { label: investigator?.name || "Conversation", href: "" },
            ]}
          />
        </div>

        <div
          className="bg-white shadow-sm border border-gray-200 rounded-lg flex flex-col"
          style={{ height: "calc(100vh - 220px)" }}
        >
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/agence/messages">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold">{investigator?.name}</h1>
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"}`}
                    />
                  </div>
                  <p className="text-sm text-gray-500">{statusText}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Link href={`/agence/enqueteurs/${investigatorId}`}>
                  <Button variant="outline" size="sm" className="gap-2 font-urbanist bg-transparent">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Profil</span>
                  </Button>
                </Link>
                {relatedMandates.length > 0 && (
                  <Link href={`/agence/mandats/${relatedMandates[0].id}`}>
                    <Button variant="outline" size="sm" className="gap-2 font-urbanist bg-transparent">
                      <Briefcase className="h-4 w-4" />
                      <span className="hidden sm:inline">Mandat</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {relatedMandates.length > 0 && (
              <div className="mt-3 p-3 bg-[#0f4c75]/5 border border-[#0f4c75]/20 rounded-lg">
                <p className="text-xs font-urbanist text-gray-600 mb-2">Mandats actifs avec cet enquêteur:</p>
                <div className="flex gap-2 flex-wrap">
                  {relatedMandates.map((mandate) => (
                    <Link key={mandate.id} href={`/agence/mandats/${mandate.id}`}>
                      <Button variant="outline" size="sm" className="text-xs font-urbanist bg-white">
                        {mandate.title}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-6 py-4"
            onScroll={(e) => {
              const element = e.currentTarget
              const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50
              setUserHasScrolledUp(!isAtBottom)
            }}
          >
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Aucun message. Commencez la conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isAgency = message.sender_type === "agency"
                  return (
                    <div key={message.id} className={`flex ${isAgency ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isAgency ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div
                          className={`flex items-center gap-1 mt-1 text-xs ${isAgency ? "text-blue-100" : "text-gray-500"}`}
                        >
                          <span>
                            {new Date(message.created_at).toLocaleTimeString("fr-CA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isAgency && (
                            <span className="ml-1">
                              {message.read ? (
                                <CheckCheck className="h-3 w-3 text-green-300" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Écrivez votre message..."
                disabled={isSending}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!messageText.trim() || isSending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
