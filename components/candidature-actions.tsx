"use client"

import { Button } from "@/components/ui/button"
import { useCandidatureActions } from "@/hooks/use-candidature-actions"
import { useEffect } from "react"

interface CandidatureActionsProps {
  candidatureId?: string
  mandateId: string
  investigatorId?: string
  action: "accept-reject" | "unassign"
}

export function CandidatureActions({ candidatureId, mandateId, investigatorId, action }: CandidatureActionsProps) {
  const { acceptCandidature, rejectCandidature, unassignInvestigator, isPending, error } = useCandidatureActions()

  useEffect(() => {
    if (error) {
      alert(`Erreur: ${error}`)
    }
  }, [error])

  const handleAccept = () => {
    if (!candidatureId || !investigatorId) return
    acceptCandidature(candidatureId, mandateId, investigatorId)
  }

  const handleReject = () => {
    if (!candidatureId) return
    rejectCandidature(candidatureId)
  }

  const handleUnassign = () => {
    unassignInvestigator(mandateId)
  }

  if (action === "unassign") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="bg-transparent"
        onClick={handleUnassign}
        disabled={isPending}
      >
        {isPending ? "Traitement..." : "Retirer"}
      </Button>
    )
  }

  return (
    <div className="flex gap-2 mt-2">
      <Button
        type="button"
        size="sm"
        className="flex-1 bg-green-600 hover:bg-green-700"
        onClick={handleAccept}
        disabled={isPending}
      >
        {isPending ? "Traitement..." : "Accepter"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="flex-1 bg-transparent"
        onClick={handleReject}
        disabled={isPending}
      >
        Refuser
      </Button>
    </div>
  )
}
