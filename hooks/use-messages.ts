"use client"

import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSupabaseClient } from "@/hooks/use-supabase-client"
import type { Database } from "@/types/database.types"

export type MessageRow = Database["public"]["Tables"]["messages"]["Row"]

interface UseMessagesParams {
  agencyId: string
  enabled?: boolean
}

export function useMessages(params: UseMessagesParams) {
  const { agencyId, enabled = true } = params
  const supabase = useSupabaseClient()
  const queryClient = useQueryClient()
  const [profile, setProfile] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    if (!supabase) return
    
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from("profiles").select("id, name").eq("id", user.id).single()

      if (data) setProfile(data)
    }
    loadProfile()
  }, [supabase])

  const messagesQuery = useQuery({
    queryKey: ["messages", agencyId],
    enabled: enabled && Boolean(agencyId) && Boolean(supabase),
    staleTime: 10_000,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("Too Many")) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async (): Promise<MessageRow[]> => {
      if (!supabase) throw new Error("Supabase client not available")
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: true })

      if (error) throw error
      return data ?? []
    },
  })

  useEffect(() => {
    if (!enabled || !agencyId || !supabase) return

    const channelName = `messages-${agencyId}`

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `agency_id=eq.${agencyId}`,
        },
        (payload) => {
          const newMessage = payload.new as MessageRow

          queryClient.setQueryData(["messages", agencyId], (old: MessageRow[] | undefined) => {
            const prev = old ?? []
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })

          if (newMessage.sender_type === "agency" && newMessage.sender_id !== profile?.id) {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Nouveau message", {
                body: newMessage.content,
                icon: "/icon.png",
              })
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `agency_id=eq.${agencyId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as MessageRow

          queryClient.setQueryData(["messages", agencyId], (old: MessageRow[] | undefined) => {
            const prev = old ?? []
            return prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, agencyId, queryClient, supabase, profile?.id])

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!supabase) throw new Error("Supabase client not available")
      if (!profile) throw new Error("Profile not loaded")

      const tempId = `temp-${Date.now()}`
      const tempMessage: MessageRow = {
        id: tempId,
        agency_id: agencyId,
        investigator_id: profile.id,
        sender_type: "investigator",
        sender_id: profile.id,
        content,
        read: false,
        read_at: null,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData(["messages", agencyId], (old: MessageRow[] | undefined) => {
        return [...(old ?? []), tempMessage]
      })

      const { data, error } = await supabase
        .from("messages")
        .insert({
          agency_id: agencyId,
          investigator_id: profile.id,
          sender_id: profile.id,
          sender_type: "investigator",
          content,
        })
        .select()
        .single()

      if (error) {
        queryClient.setQueryData(["messages", agencyId], (old: MessageRow[] | undefined) => {
          return (old ?? []).filter((m) => m.id !== tempId)
        })
        throw error
      }

      queryClient.setQueryData(["messages", agencyId], (old: MessageRow[] | undefined) => {
        return (old ?? []).map((m) => (m.id === tempId ? data : m))
      })

      return data as MessageRow
    },
  })

  const markAsRead = useMutation({
    mutationFn: async (messageIds: string[]) => {
      if (!supabase) throw new Error("Supabase client not available")
      
      queryClient.setQueryData(["messages", agencyId], (old: MessageRow[] | undefined) => {
        return (old ?? []).map((m) =>
          messageIds.includes(m.id) ? { ...m, read: true, read_at: new Date().toISOString() } : m,
        )
      })

      const { error } = await supabase
        .from("messages")
        .update({ read: true, read_at: new Date().toISOString() })
        .in("id", messageIds)

      if (error) {
        queryClient.invalidateQueries({ queryKey: ["messages", agencyId] })
        throw error
      }
    },
  })

  const unreadCount = (messagesQuery.data ?? []).filter((m) => !m.read && m.sender_type === "agency").length

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    unreadCount,
    sendMessage: (content: string) => sendMessage.mutate(content),
    markAsRead: (messageIds: string[]) => markAsRead.mutate(messageIds),
    isSending: sendMessage.isPending,
  } as const
}
