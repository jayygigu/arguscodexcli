"use client"

import { useAutoPresence } from "@/hooks/use-presence"

export function AutoStatusUpdater() {
  useAutoPresence()
  return null
}
