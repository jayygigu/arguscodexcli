"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useCandidatureActions } from "@/hooks/use-candidature-actions"
import { CandidatureActionDialog } from "@/components/workflow/candidature-action-dialog"
import { useToast } from "@/hooks/use-toast"

interface CandidatureActionsProps {
  candidatureId?: string
  mandateId: string
  investigatorId?: string
  action: "accept-reject" | "unassign"
  investigatorName?: string
  investigatorCity?: string
  investigatorExperience?: number
  investigatorRating?: number
  mandateTitle?: string
}

export function CandidatureActions({
  candidatureId,
  mandateId,
  investigatorId,
  action,
  investigatorName = "Enquêteur",
  investigatorCity,
  investigatorExperience,
  investigatorRating,
  mandateTitle = "ce mandat",
}: CandidatureActionsProps) {
  const { acceptCandidature, rejectCandidature, unassignInvestigator, isPending, error } = useCandidatureActions()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<"accept" | "reject">("accept")

  const handleAcceptClick = () => {
    setDialogAction("accept")
    setDialogOpen(true)
  }

  const handleRejectClick = () => {
    setDialogAction("reject")
    setDialogOpen(true)
  }

  const handleConfirm = () => {
    if (dialogAction === "accept") {
      if (!candidatureId || !investigatorId) return
      acceptCandidature(candidatureId, mandateId, investigatorId)
      toast({
        title: "Candidature acceptée",
        description: `${investigatorName} a été assigné au mandat.`,
      })
    } else {
      if (!candidatureId) return
      rejectCandidature(candidatureId)
      toast({
        title: "Candidature refusée",
        description: `${investigatorName} a été informé.`,
      })
    }
    setDialogOpen(false)
  }

  const handleUnassign = () => {
    unassignInvestigator(mandateId)
    toast({
      title: "Enquêteur retiré",
      description: "L'enquêteur a été retiré du mandat.",
    })
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
    <>
      <div className="flex gap-2 mt-2">
        <Button
          type="button"
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700"
          onClick={handleAcceptClick}
          disabled={isPending}
        >
          {isPending ? "..." : "Accepter"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1 bg-transparent"
          onClick={handleRejectClick}
          disabled={isPending}
        >
          Refuser
        </Button>
      </div>

      <CandidatureActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
        candidature={{
          id: candidatureId || "",
          investigatorName,
          investigatorCity,
          investigatorExperience,
          investigatorRating,
          mandateTitle,
        }}
        onConfirm={handleConfirm}
        isPending={isPending}
      />
    </>
  )
}
