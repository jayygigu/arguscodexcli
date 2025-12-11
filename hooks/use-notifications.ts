"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase-browser"

interface NotificationCounts {
  unreadMessages: number
  newApplications: number
  unreadNotifications: number
}

interface NotificationItem {
  id: string
  type: "message" | "application" | "system"
  title: string
  description: string
  timestamp: string
  link: string
  isRead: boolean
}

interface NotificationsData {
  counts: NotificationCounts
  items: NotificationItem[]
}

export function useNotifications(agencyId: string | null) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ["notifications", agencyId],
    enabled: Boolean(agencyId),
    refetchInterval: 30000,
    queryFn: async (): Promise<NotificationsData> => {
      if (!agencyId) {
        return { counts: { unreadMessages: 0, newApplications: 0, unreadNotifications: 0 }, items: [] }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return { counts: { unreadMessages: 0, newApplications: 0, unreadNotifications: 0 }, items: [] }
      }

      const { data: systemNotifications, error: notifError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(10)

      if (notifError) {
        console.error("[v0] Error fetching notifications:", notifError)
      }

      const { data: unreadMessages } = await supabase
        .from("messages")
        .select("id, content, created_at, sender_type, sender_id, investigator_id")
        .eq("agency_id", agencyId)
        .eq("read", false)
        .eq("sender_type", "investigator")
        .order("created_at", { ascending: false })
        .limit(5)

      let investigatorProfilesForMessages: any[] = []
      if (unreadMessages && unreadMessages.length > 0) {
        const investigatorIds = [...new Set(unreadMessages.map((msg) => msg.investigator_id).filter(Boolean))]
        if (investigatorIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", investigatorIds)
          investigatorProfilesForMessages = profiles || []
        }
      }

      const { data: newApplications } = await supabase
        .from("mandate_interests")
        .select(
          `
          id,
          created_at,
          mandate_id,
          investigator_id,
          mandates!inner(id, title, agency_id)
        `,
        )
        .eq("mandates.agency_id", agencyId)
        .eq("status", "interested")
        .order("created_at", { ascending: false })
        .limit(5)

      let investigatorProfilesForApps: any[] = []
      if (newApplications && newApplications.length > 0) {
        const investigatorIds = newApplications.map((app) => app.investigator_id)
        const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", investigatorIds)
        investigatorProfilesForApps = profiles || []
      }

      const systemNotificationItems: NotificationItem[] = (systemNotifications || []).map((notif) => ({
        id: notif.id,
        type: "system" as const,
        title: notif.title,
        description: notif.message,
        timestamp: notif.created_at,
        link: notif.mandate_id ? `/agence/mandats/${notif.mandate_id}` : "/agence/dashboard",
        isRead: notif.read,
      }))

      const messageNotifications: NotificationItem[] = (unreadMessages || []).map((msg) => {
        const investigator = investigatorProfilesForMessages.find((p) => p.id === msg.investigator_id)
        return {
          id: msg.id,
          type: "message" as const,
          title: `Message de ${investigator?.name || "Enquêteur"}`,
          description: msg.content.length > 60 ? `${msg.content.substring(0, 60)}...` : msg.content,
          timestamp: msg.created_at,
          link: msg.investigator_id ? `/agence/messages/direct/${msg.investigator_id}` : "/agence/messages",
          isRead: false,
        }
      })

      const applicationNotifications: NotificationItem[] = (newApplications || []).map((app: any) => {
        const investigator = investigatorProfilesForApps.find((p) => p.id === app.investigator_id)
        return {
          id: app.id,
          type: "application" as const,
          title: `Nouvelle candidature de ${investigator?.name || "Enquêteur"}`,
          description: `Pour le mandat: ${app.mandates?.title}`,
          timestamp: app.created_at,
          link: `/agence/candidatures`,
          isRead: false,
        }
      })

      const allNotifications = [...systemNotificationItems, ...messageNotifications, ...applicationNotifications].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )

      return {
        counts: {
          unreadMessages: unreadMessages?.length ?? 0,
          newApplications: newApplications?.length ?? 0,
          unreadNotifications: systemNotifications?.length ?? 0,
        },
        items: allNotifications.slice(0, 10),
      }
    },
  })

  useEffect(() => {
    if (!agencyId) return

    const notificationsChannel = supabase
      .channel(`notifications-system-${agencyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", agencyId] })
        },
      )
      .subscribe()

    const messagesChannel = supabase
      .channel(`notifications-messages-${agencyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `agency_id=eq.${agencyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", agencyId] })
        },
      )
      .subscribe()

    const interestsChannel = supabase
      .channel(`notifications-interests-${agencyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mandate_interests",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", agencyId] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notificationsChannel)
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(interestsChannel)
    }
  }, [agencyId, queryClient, supabase])

  return {
    unreadMessages: data?.counts.unreadMessages ?? 0,
    newApplications: data?.counts.newApplications ?? 0,
    unreadNotifications: data?.counts.unreadNotifications ?? 0,
    totalNotifications:
      (data?.counts.unreadMessages ?? 0) +
      (data?.counts.newApplications ?? 0) +
      (data?.counts.unreadNotifications ?? 0),
    notifications: data?.items ?? [],
  }
}
