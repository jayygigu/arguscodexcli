"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  acceptCandidatureAction,
  rejectCandidatureAction,
  unrejectCandidatureAction,
  unassignInvestigatorAction,
  completeMandateAction,
  reopenMandateAction,
  directAssignInvestigatorAction,
} from "@/actions/candidature-actions"

export function useCandidatureActions() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const router = useRouter()

  const setErrorWithTimeout = useCallback((errorMessage: string | null) => {
    setError(errorMessage)
    if (errorMessage) {
      setTimeout(() => setError(null), 5000)
    }
  }, [])

  const acceptCandidature = useCallback(
    async (
      candidatureId: string,
      mandateId: string,
      investigatorId: string,
    ): Promise<{ success: boolean; redirectUrl?: string }> => {
      setErrorWithTimeout(null)
      setLastAction("accept")

      return new Promise((resolve) => {
        startTransition(async () => {
          const result = await acceptCandidatureAction(candidatureId, mandateId, investigatorId)

          if (!result.success) {
            setErrorWithTimeout(result.error || "Une erreur est survenue")
            resolve({ success: false })
          } else {
            if (result.redirectUrl) {
              router.push(result.redirectUrl)
            } else {
              router.refresh()
            }
            resolve({ success: true, redirectUrl: result.redirectUrl })
          }
        })
      })
    },
    [router, setErrorWithTimeout],
  )

  const rejectCandidature = useCallback(
    async (candidatureId: string): Promise<{ success: boolean }> => {
      setErrorWithTimeout(null)
      setLastAction("reject")

      return new Promise((resolve) => {
        startTransition(async () => {
          const result = await rejectCandidatureAction(candidatureId)

          if (!result.success) {
            setErrorWithTimeout(result.error || "Une erreur est survenue")
            resolve({ success: false })
          } else {
            router.refresh()
            resolve({ success: true })
          }
        })
      })
    },
    [router, setErrorWithTimeout],
  )

  const unrejectCandidature = useCallback(
    async (candidatureId: string): Promise<{ success: boolean }> => {
      setErrorWithTimeout(null)
      setLastAction("unreject")

      return new Promise((resolve) => {
        startTransition(async () => {
          const result = await unrejectCandidatureAction(candidatureId)

          if (!result.success) {
            setErrorWithTimeout(result.error || "Une erreur est survenue")
            resolve({ success: false })
          } else {
            router.refresh()
            resolve({ success: true })
          }
        })
      })
    },
    [router, setErrorWithTimeout],
  )

  const unassignInvestigator = useCallback(
    async (mandateId: string): Promise<{ success: boolean }> => {
      setErrorWithTimeout(null)
      setLastAction("unassign")

      return new Promise((resolve) => {
        startTransition(async () => {
          const result = await unassignInvestigatorAction(mandateId)

          if (!result.success) {
            setErrorWithTimeout(result.error || "Une erreur est survenue")
            resolve({ success: false })
          } else {
            router.refresh()
            resolve({ success: true })
          }
        })
      })
    },
    [router, setErrorWithTimeout],
  )

  const completeMandate = useCallback(
    async (mandateId: string): Promise<{ success: boolean; redirectUrl?: string }> => {
      setErrorWithTimeout(null)
      setLastAction("complete")

      return new Promise((resolve) => {
        startTransition(async () => {
          const result = await completeMandateAction(mandateId)

          if (!result.success) {
            setErrorWithTimeout(result.error || "Une erreur est survenue")
            resolve({ success: false })
          } else {
            if (result.redirectUrl) {
              router.push(result.redirectUrl)
            } else {
              router.refresh()
            }
            resolve({ success: true, redirectUrl: result.redirectUrl })
          }
        })
      })
    },
    [router, setErrorWithTimeout],
  )

  const reopenMandate = useCallback(
    async (mandateId: string): Promise<{ success: boolean }> => {
      setErrorWithTimeout(null)
      setLastAction("reopen")

      return new Promise((resolve) => {
        startTransition(async () => {
          const result = await reopenMandateAction(mandateId)

          if (!result.success) {
            setErrorWithTimeout(result.error || "Une erreur est survenue")
            resolve({ success: false })
          } else {
            router.refresh()
            resolve({ success: true })
          }
        })
      })
    },
    [router, setErrorWithTimeout],
  )

  const directAssign = useCallback(
    async (mandateId: string, investigatorId: string): Promise<{ success: boolean }> => {
      setErrorWithTimeout(null)
      setLastAction("directAssign")

      return new Promise((resolve) => {
        startTransition(async () => {
          const result = await directAssignInvestigatorAction(mandateId, investigatorId)

          if (!result.success) {
            setErrorWithTimeout(result.error || "Une erreur est survenue")
            resolve({ success: false })
          } else {
            router.refresh()
            resolve({ success: true })
          }
        })
      })
    },
    [router, setErrorWithTimeout],
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    acceptCandidature,
    rejectCandidature,
    unrejectCandidature, // Added to exports
    unassignInvestigator,
    completeMandate,
    reopenMandate,
    directAssign,
    isPending,
    error,
    lastAction,
    clearError,
  }
}
