"use client"

import { useEffect, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase-browser"
import type { Database } from "@/types/database.types"

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

export interface UserPresence {
  userId: string
  isOnline: boolean
  lastSeenAt: string | null
  statusUpdatedAt: string | null
}

const HEARTBEAT_INTERVAL = 30000 // 30 seconds
const OFFLINE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

export function usePresence(userId?: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const presenceQuery = useQuery({
    queryKey: ["presence", userId],
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: async (): Promise<UserPresence | null> => {
      if (!userId) return null

      const { data, error } = await supabase
        .from("profiles")
        .select("id, is_online, last_seen_at, status_updated_at")
        .eq("id", userId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return {
        userId: data.id,
        isOnline: data.is_online ?? false,
        lastSeenAt: data.last_seen_at,
        statusUpdatedAt: data.status_updated_at,
      }
    },
  })

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`presence-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newProfile = payload.new as ProfileRow
          const presence: UserPresence = {
            userId: newProfile.id,
            isOnline: newProfile.is_online ?? false,
            lastSeenAt: newProfile.last_seen_at,
            statusUpdatedAt: newProfile.status_updated_at,
          }
          queryClient.setQueryData(["presence", userId], presence)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient, supabase])

  const getLastSeenText = useCallback((lastSeenAt: string | null, isOnline: boolean): string => {
    if (isOnline) return "En ligne"
    if (!lastSeenAt) return "Hors ligne"

    const now = Date.now()
    const lastSeen = new Date(lastSeenAt).getTime()
    const diffMs = now - lastSeen
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Il y a ${diffHours}h`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `Il y a ${diffDays}j`

    return "Hors ligne"
  }, [])

  const presence = presenceQuery.data
  const statusText = presence ? getLastSeenText(presence.lastSeenAt, presence.isOnline) : "Hors ligne"

  return {
    presence,
    isOnline: presence?.isOnline ?? false,
    lastSeenAt: presence?.lastSeenAt,
    statusText,
    isLoading: presenceQuery.isLoading,
    getLastSeenText,
  } as const
}

export function useAutoPresence() {
  const supabase = createClient()

  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout
    let isMounted = true
    let isAuthenticated = false

    async function updatePresence(isOnline: boolean) {
      if (!isMounted || !isAuthenticated) return

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          isAuthenticated = false
          return
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            is_online: isOnline,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", user.id)

        if (error) {
          // Silently fail - user might not be authenticated or network issue
          return
        }
      } catch (error) {
        // Silently fail on network errors to prevent console spam on login page
        return
      }
    }

    async function initPresence() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user || !isMounted) {
          return
        }

        isAuthenticated = true

        // Initial presence update
        await updatePresence(true)

        // Set up heartbeat interval
        heartbeatInterval = setInterval(() => {
          if (isMounted && isAuthenticated) {
            updatePresence(true)
          }
        }, HEARTBEAT_INTERVAL)
      } catch (error) {
        // User not authenticated, do nothing
        return
      }
    }

    initPresence()

    const handleVisibilityChange = () => {
      if (!isAuthenticated) return

      if (document.hidden) {
        updatePresence(false)
      } else {
        updatePresence(true)
      }
    }

    const handleBeforeUnload = () => {
      if (!isAuthenticated) return
      updatePresence(false)
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      isMounted = false
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      if (isAuthenticated) {
        updatePresence(false)
      }
    }
  }, [supabase])
}

export function isUserRecentlyActive(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false
  const now = Date.now()
  const lastSeen = new Date(lastSeenAt).getTime()
  return now - lastSeen < OFFLINE_THRESHOLD
}
