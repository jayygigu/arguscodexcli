"use client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, User, Star, MapPin, Briefcase } from "lucide-react"

interface CandidatureActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: "accept" | "reject"
  candidature: {
    id: string
    investigatorName: string
    investigatorCity?: string
    investigatorExperience?: number
    investigatorRating?: number
    mandateTitle: string
  }
  onConfirm: () => void
  isPending?: boolean
}

export function CandidatureActionDialog({
  open,
  onOpenChange,
  action,
  candidature,
  onConfirm,
  isPending,
}: CandidatureActionDialogProps) {
  const isAccept = action === "accept"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${isAccept ? "bg-green-100" : "bg-red-100"}`}>
              {isAccept ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <AlertDialogTitle>
              {isAccept ? "Accepter cette candidature ?" : "Refuser cette candidature ?"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Investigator summary */}
              <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{candidature.investigatorName}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {candidature.investigatorCity && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {candidature.investigatorCity}
                    </Badge>
                  )}
                  {candidature.investigatorExperience && (
                    <Badge variant="outline" className="gap-1">
                      <Briefcase className="h-3 w-3" />
                      {candidature.investigatorExperience} ans
                    </Badge>
                  )}
                  {candidature.investigatorRating && (
                    <Badge variant="outline" className="gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {candidature.investigatorRating.toFixed(1)}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action explanation */}
              <p className="text-sm text-muted-foreground">
                {isAccept ? (
                  <>
                    En acceptant, <strong>{candidature.investigatorName}</strong> sera assigné au mandat{" "}
                    <strong>"{candidature.mandateTitle}"</strong> et pourra commencer à travailler immédiatement. Les
                    autres candidatures seront automatiquement refusées.
                  </>
                ) : (
                  <>
                    En refusant, <strong>{candidature.investigatorName}</strong> sera informé que sa candidature n'a pas
                    été retenue pour le mandat <strong>"{candidature.mandateTitle}"</strong>. Vous pourrez restaurer
                    cette candidature plus tard si nécessaire.
                  </>
                )}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={isAccept ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
          >
            {isPending ? "Traitement..." : isAccept ? "Accepter et assigner" : "Refuser"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
