"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSupabaseClient } from "./use-supabase-client"
import { useEffect, useMemo } from "react"

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

  // Memoize enabled state to prevent unnecessary re-renders
  const enabled = useMemo(() => {
    return Boolean(agencyId && supabase && supabase.auth)
  }, [agencyId, supabase])

  const { data } = useQuery({
    queryKey: ["notifications", agencyId],
    enabled, // Only enable if supabase is available and has auth
    staleTime: 30000,
    queryFn: async (): Promise<Notification[]> => {
      if (!supabase || !supabase.auth || !agencyId) {
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
    if (!enabled || !supabase || !supabase.auth || !agencyId) return

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
      if (supabase && channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [enabled, supabase, agencyId, queryClient])

  // Memoize computed values to prevent unnecessary recalculations
  const result = useMemo(() => {
    const unreadMessages = data?.filter((n) => n.type === "message" && !n.read).length ?? 0
    const newApplications = data?.filter((n) => n.type === "application" && !n.read).length ?? 0
    const totalNotifications = data?.filter((n) => !n.read).length ?? 0

    return {
      notifications: data ?? [],
      unreadMessages,
      newApplications,
      totalNotifications,
    }
  }, [data])

  return result
}
