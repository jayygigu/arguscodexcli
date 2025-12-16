"use client"

import { useEffect } from "react"
import { useSupabaseClient } from "./use-supabase-client"

const HEARTBEAT_INTERVAL = 30000 // 30 seconds

export function usePresence(userId?: string) {
  const supabase = useSupabaseClient()

  useEffect(() => {
    if (!supabase || !userId) return

    let channel: any = null
    let heartbeatInterval: NodeJS.Timeout

    const setupPresence = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) return

        channel = supabase
          .channel(`presence:${userId}`, {
            config: {
              presence: {
                key: session.user.id,
              },
            },
          })
          .on("presence", { event: "sync" }, () => {
            const state = channel.presenceState()
            // Handle presence state updates
          })
          .on("presence", { event: "join" }, ({ key, newPresences }) => {
            // Handle user join
          })
          .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
            // Handle user leave
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await channel.track({
                online_at: new Date().toISOString(),
                user_id: session.user.id,
              })
            }
          })

        // Heartbeat to keep presence alive
        heartbeatInterval = setInterval(() => {
          if (channel && channel.state === "joined") {
            channel.track({
              online_at: new Date().toISOString(),
              user_id: session.user.id,
            })
          }
        }, HEARTBEAT_INTERVAL)
      } catch (error) {
        console.error("Error setting up presence:", error)
      }
    }

    setupPresence()

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, userId])

  return {
    isOnline: true, // Simplified for now
    lastSeen: new Date().toISOString(),
  }
}

export function useAutoPresence() {
  const supabase = useSupabaseClient()

  useEffect(() => {
    // Only run if supabase is available
    if (!supabase) return
    
    let heartbeatInterval: NodeJS.Timeout
    let isMounted = true
    let isAuthenticated = false

    async function updatePresence(isOnline: boolean) {
      if (!isMounted || !isAuthenticated || !supabase) return

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          isAuthenticated = false
          return
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            is_online: isOnline,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", session.user.id)

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
      if (!supabase) return
      
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user || !isMounted) {
          return
        }

        isAuthenticated = true

        // Initial presence update
        await updatePresence(true)

        // Set up heartbeat interval
        heartbeatInterval = setInterval(() => {
          if (isMounted && isAuthenticated && supabase) {
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
      if (!isAuthenticated || !supabase) return

      if (document.hidden) {
        updatePresence(false)
      } else {
        updatePresence(true)
      }
    }

    const handleBeforeUnload = () => {
      if (!isAuthenticated || !supabase) return
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
    }
  }, [supabase])
}
