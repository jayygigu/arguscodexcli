"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  acceptCandidatureAction,
  rejectCandidatureAction,
  unassignInvestigatorAction,
  completeMandateAction,
  reopenMandateAction,
} from "@/actions/candidature-actions"

export function useCandidatureActions() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const acceptCandidature = async (candidatureId: string, mandateId: string, investigatorId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await acceptCandidatureAction(candidatureId, mandateId, investigatorId)

      if (!result.success) {
        setError(result.error || "Une erreur est survenue")
      } else {
        router.refresh()
      }
    })
  }

  const rejectCandidature = async (candidatureId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await rejectCandidatureAction(candidatureId)

      if (!result.success) {
        setError(result.error || "Une erreur est survenue")
      } else {
        router.refresh()
      }
    })
  }

  const unassignInvestigator = async (mandateId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await unassignInvestigatorAction(mandateId)

      if (!result.success) {
        setError(result.error || "Une erreur est survenue")
      } else {
        router.refresh()
      }
    })
  }

  const completeMandate = async (mandateId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await completeMandateAction(mandateId)

      if (!result.success) {
        setError(result.error || "Une erreur est survenue")
      } else {
        router.refresh()
      }
    })
  }

  const reopenMandate = async (mandateId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await reopenMandateAction(mandateId)

      if (!result.success) {
        setError(result.error || "Une erreur est survenue")
      } else {
        router.refresh()
      }
    })
  }

  return {
    acceptCandidature,
    rejectCandidature,
    unassignInvestigator,
    completeMandate,
    reopenMandate,
    isPending,
    error,
  }
}
