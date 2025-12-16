"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSupabaseClient } from "./use-supabase-client"
import { useEffect } from "react"

interface Notification {
  id: string
  agency_id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
  related_mandate_id?: string
  related_investigator_id?: string
}

export function useNotifications(agencyId: string | null) {
  const supabase = useSupabaseClient()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ["notifications", agencyId],
    enabled: Boolean(agencyId && supabase), // Only enable if supabase is available
    staleTime: 30000,
    queryFn: async (): Promise<Notification[]> => {
      if (!supabase || !agencyId) {
        return []
      }
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      return data ?? []
    },
  })

  useEffect(() => {
    if (!supabase || !agencyId) return

    const channel = supabase
      .channel(`notifications:${agencyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `agency_id=eq.${agencyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", agencyId] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, agencyId, queryClient])

  const unreadMessages = data?.filter((n) => n.type === "message" && !n.read).length ?? 0
  const newApplications = data?.filter((n) => n.type === "application" && !n.read).length ?? 0
  const totalNotifications = data?.filter((n) => !n.read).length ?? 0

  return {
    notifications: data ?? [],
    unreadMessages,
    newApplications,
    totalNotifications,
  }
}
