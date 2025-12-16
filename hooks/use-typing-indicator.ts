"use client"

import { useEffect, useState, useRef } from "react"
import { useSupabaseClient } from "@/hooks/use-supabase-client"

interface TypingState {
  userId: string
  userName: string
  timestamp: number
}

export function useTypingIndicator(conversationId: string, currentUserId: string) {
  const supabase = useSupabaseClient()
  const [typingUsers, setTypingUsers] = useState<TypingState[]>([])
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isCurrentlyTypingRef = useRef(false)

  useEffect(() => {
    if (!currentUserId || !conversationId || !supabase) return

    const fetchTypingIndicators = async () => {
      const { data } = await supabase
        .from("typing_indicators")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("is_typing", true)
        .neq("user_id", currentUserId)

      if (data) {
        setTypingUsers(
          data.map((indicator) => ({
            userId: indicator.user_id,
            userName: indicator.user_name,
            timestamp: new Date(indicator.updated_at).getTime(),
          })),
        )
      }
    }

    fetchTypingIndicators()

    const channel = supabase
      .channel(`typing-indicators-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const indicator = payload.new as any
            if (indicator.user_id === currentUserId) return

            if (indicator.is_typing) {
              setTypingUsers((prev) => {
                const filtered = prev.filter((u) => u.userId !== indicator.user_id)
                return [
                  ...filtered,
                  {
                    userId: indicator.user_id,
                    userName: indicator.user_name,
                    timestamp: new Date(indicator.updated_at).getTime(),
                  },
                ]
              })
            } else {
              setTypingUsers((prev) => prev.filter((u) => u.userId !== indicator.user_id))
            }
          } else if (payload.eventType === "DELETE") {
            const indicator = payload.old as any
            setTypingUsers((prev) => prev.filter((u) => u.userId !== indicator.user_id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, supabase])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setTypingUsers((prev) => prev.filter((u) => now - u.timestamp < 10000))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const sendTypingIndicator = async (isTyping: boolean, userName: string) => {
    if (!currentUserId || !supabase) return

    try {
      await supabase.from("typing_indicators").upsert(
        {
          conversation_id: conversationId,
          user_id: currentUserId,
          user_name: userName,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id,user_id" },
      )
    } catch (error) {
      // Silent fail for typing indicators
    }
  }

  const startTyping = (userName: string) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    if (!isCurrentlyTypingRef.current) {
      sendTypingIndicator(true, userName)
      isCurrentlyTypingRef.current = true
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false, userName)
      isCurrentlyTypingRef.current = false
    }, 5000)
  }

  const stopTyping = (userName: string) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    if (isCurrentlyTypingRef.current) {
      sendTypingIndicator(false, userName)
      isCurrentlyTypingRef.current = false
    }
  }

  return {
    typingUsers,
    startTyping,
    stopTyping,
    isTyping: typingUsers.length > 0,
    typingText: typingUsers.length > 0 ? `${typingUsers[0].userName} est en train d'écrire...` : null,
  }
}
