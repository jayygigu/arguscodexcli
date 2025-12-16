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

  // Memoize enabled state with strict validation
  const enabled = useMemo(() => {
    try {
      // CRITICAL: Check if supabase exists and has auth property before accessing it
      if (!agencyId || !supabase) {
        return false
      }
      
      // Check if auth exists and is an object
      if (!supabase.auth || typeof supabase.auth !== "object") {
        return false
      }
      
      // Check if auth has required methods
      if (typeof supabase.auth.getSession !== "function") {
        return false
      }
      
      return true
    } catch (error) {
      // If any error occurs, disable the query
      return false
    }
  }, [agencyId, supabase])

  const { data } = useQuery({
    queryKey: ["notifications", agencyId],
    enabled, // Only enable if supabase is available and has auth
    staleTime: 30000,
    queryFn: async (): Promise<Notification[]> => {
      try {
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
      } catch (error) {
        console.error("[useNotifications] Error fetching notifications:", error)
        return []
      }
    },
  })

  useEffect(() => {
    if (!enabled || !supabase || !supabase.auth || !agencyId) return

    try {
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
          try {
            supabase.removeChannel(channel)
          } catch (error) {
            console.error("[useNotifications] Error removing channel:", error)
          }
        }
      }
    } catch (error) {
      console.error("[useNotifications] Error setting up channel:", error)
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
