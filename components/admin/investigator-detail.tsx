"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Save,
  Ban,
  Loader2,
  Award,
  Briefcase,
  Star,
} from "lucide-react"
import { useSupabaseClient } from "@/hooks/use-supabase-client"
import { toast } from "@/hooks/use-toast"

type VerificationStatus = "pending" | "verified" | "rejected" | "suspended"

interface Investigator {
  id: string
  name: string
  email?: string
  phone?: string
  license_number?: string
  city?: string
  region?: string
  postal_code?: string
  address?: string
  years_experience?: number
  availability_status?: string
  verification_status?: VerificationStatus
  verification_notes?: string
  verified_at?: string
  verified_by?: string
  created_at: string
  updated_at?: string
}

interface Stats {
  completed_mandates?: number
  average_rating?: number
  response_rate?: number
}

interface InvestigatorDetailProps {
  investigator: Investigator
  stats?: Stats | null
  currentUserId: string
}

const statusConfig = {
  pending: {
    label: "En attente",
    variant: "outline" as const,
    icon: Clock,
    color: "text-amber-500 bg-amber-500/10",
  },
  verified: {
    label: "Vérifié",
    variant: "default" as const,
    icon: CheckCircle,
    color: "text-emerald-500 bg-emerald-500/10",
  },
  rejected: {
    label: "Rejeté",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-red-500 bg-red-500/10",
  },
  suspended: {
    label: "Suspendu",
    variant: "secondary" as const,
    icon: Ban,
    color: "text-gray-500 bg-gray-500/10",
  },
}

export function InvestigatorDetail({ investigator, stats, currentUserId }: InvestigatorDetailProps) {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState(investigator.verification_notes || "")
  const [licenseVerified, setLicenseVerified] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<string | null>(null)
  const [reason, setReason] = useState("")

  const status = (investigator.verification_status || "pending") as VerificationStatus
  const statusInfo = statusConfig[status]
  const StatusIcon = statusInfo.icon

  const openDialog = (action: string) => {
    setDialogAction(action)
    setReason("")
    setDialogOpen(true)
  }

  const confirmAction = async () => {
    setLoading(true)
    setDialogOpen(false)

    try {
      let newStatus: VerificationStatus | null = null

      switch (dialogAction) {
        case "verify":
          if (!licenseVerified) {
            toast({
              title: "Erreur",
              description: "Vous devez confirmer la vérification du permis",
              variant: "destructive",
            })
            setLoading(false)
            return
          }
          newStatus = "verified"
          break
        case "reject":
          if (!reason.trim()) {
            toast({
              title: "Erreur",
              description: "Une raison est requise pour le rejet",
              variant: "destructive",
            })
            setLoading(false)
            return
          }
          newStatus = "rejected"
          break
        case "suspend":
          if (!reason.trim()) {
            toast({
              title: "Erreur",
              description: "Une raison est requise pour la suspension",
              variant: "destructive",
            })
            setLoading(false)
            return
          }
          newStatus = "suspended"
          break
        case "reactivate":
          newStatus = "verified"
          break
      }

      if (newStatus) {
        const updateData: Record<string, unknown> = {
          verification_status: newStatus,
          verification_notes: dialogAction === "reject" || dialogAction === "suspend" ? reason : notes,
          updated_at: new Date().toISOString(),
        }

        if (newStatus === "verified") {
          updateData.verified_at = new Date().toISOString()
          updateData.verified_by = currentUserId
        }

        const { error } = await supabase.from("profiles").update(updateData).eq("id", investigator.id)

        if (error) {
          throw error
        }

        // Log the action
        await supabase.from("verification_logs").insert({
          entity_type: "investigator",
          entity_id: investigator.id,
          action: dialogAction,
          new_status: newStatus,
          reason: reason || null,
          notes: notes || null,
          admin_id: currentUserId,
        })

        toast({
          title: "Succès",
          description: `L'enquêteur a été ${
            newStatus === "verified"
              ? "vérifié"
              : newStatus === "rejected"
                ? "rejeté"
                : newStatus === "suspended"
                  ? "suspendu"
                  : "mis à jour"
          }`,
        })

        router.refresh()
      }
    } catch (error) {
      console.error("Error updating investigator:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveNotes = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ verification_notes: notes, updated_at: new Date().toISOString() })
        .eq("id", investigator.id)

      if (error) throw error

      toast({
        title: "Succès",
        description: "Notes enregistrées",
      })
    } catch (error) {
      console.error("Error saving notes:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les notes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-montserrat font-bold text-foreground">{investigator.name}</h1>
            <p className="text-muted-foreground font-urbanist">Enquêteur #{investigator.id.slice(0, 8)}</p>
          </div>
        </div>
        <Badge variant={statusInfo.variant} className="gap-1 text-sm py-1 px-3">
          <StatusIcon className="w-4 h-4" />
          {statusInfo.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-urbanist">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Nom complet</Label>
                <p className="font-medium">{investigator.name}</p>
              </div>
              {investigator.email && (
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {investigator.email}
                  </p>
                </div>
              )}
              {investigator.phone && (
                <div>
                  <Label className="text-muted-foreground">Téléphone</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {investigator.phone}
                  </p>
                </div>
              )}
              {(investigator.city || investigator.region) && (
                <div>
                  <Label className="text-muted-foreground">Localisation</Label>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {[investigator.address, investigator.city, investigator.postal_code, investigator.region]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Professional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-urbanist">
                <FileText className="w-5 h-5" />
                Informations professionnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">N° de permis</Label>
                <p className="font-mono font-medium text-lg">{investigator.license_number || "Non renseigné"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Expérience</Label>
                <p className="font-medium flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  {investigator.years_experience !== undefined
                    ? `${investigator.years_experience} an${investigator.years_experience !== 1 ? "s" : ""}`
                    : "Non renseigné"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Disponibilité</Label>
                <Badge variant={investigator.availability_status === "available" ? "default" : "secondary"}>
                  {investigator.availability_status === "available"
                    ? "Disponible"
                    : investigator.availability_status === "busy"
                      ? "Occupé"
                      : "Indisponible"}
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Inscrit le</Label>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(investigator.created_at).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-urbanist">
                  <Award className="w-5 h-5" />
                  Statistiques
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary">{stats.completed_mandates || 0}</p>
                  <p className="text-sm text-muted-foreground">Mandats complétés</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary flex items-center justify-center gap-1">
                    {stats.average_rating?.toFixed(1) || "-"}
                    <Star className="w-5 h-5 text-amber-500" />
                  </p>
                  <p className="text-sm text-muted-foreground">Note moyenne</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary">
                    {stats.response_rate ? `${stats.response_rate}%` : "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Taux de réponse</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Verification Actions */}
        <div className="space-y-6">
          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="font-urbanist">Statut de vérification</CardTitle>
              <CardDescription>
                {status === "pending" && "En attente de vérification du permis"}
                {status === "verified" &&
                  `Vérifié le ${investigator.verified_at ? new Date(investigator.verified_at).toLocaleDateString("fr-FR") : ""}`}
                {status === "rejected" && "La vérification a été refusée"}
                {status === "suspended" && "Le compte est suspendu"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status === "pending" && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="license"
                      checked={licenseVerified}
                      onCheckedChange={(checked) => setLicenseVerified(checked as boolean)}
                    />
                    <Label htmlFor="license" className="text-sm">
                      J'ai vérifié que le permis {investigator.license_number} est valide
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openDialog("verify")}
                      disabled={loading || !licenseVerified}
                      className="flex-1"
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Vérifier
                    </Button>
                    <Button variant="destructive" onClick={() => openDialog("reject")} disabled={loading}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeter
                    </Button>
                  </div>
                </>
              )}

              {status === "verified" && (
                <Button
                  variant="destructive"
                  onClick={() => openDialog("suspend")}
                  disabled={loading}
                  className="w-full"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Suspendre le compte
                </Button>
              )}

              {(status === "rejected" || status === "suspended") && (
                <Button onClick={() => openDialog("reactivate")} disabled={loading} className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Réactiver le compte
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="font-urbanist">Notes de vérification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajouter des notes internes..."
                rows={4}
              />
              <Button onClick={saveNotes} disabled={loading} variant="outline" className="w-full bg-transparent">
                <Save className="w-4 h-4 mr-2" />
                Enregistrer les notes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "verify" && "Vérifier cet enquêteur"}
              {dialogAction === "reject" && "Rejeter cet enquêteur"}
              {dialogAction === "suspend" && "Suspendre cet enquêteur"}
              {dialogAction === "reactivate" && "Réactiver cet enquêteur"}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === "verify" && "Confirmez que vous avez vérifié le permis de cet enquêteur."}
              {dialogAction === "reject" && "Indiquez la raison du rejet."}
              {dialogAction === "suspend" && "Indiquez la raison de la suspension."}
              {dialogAction === "reactivate" &&
                "Le compte sera réactivé et l'enquêteur pourra à nouveau recevoir des mandats."}
            </DialogDescription>
          </DialogHeader>

          {(dialogAction === "reject" || dialogAction === "suspend") && (
            <div className="space-y-2">
              <Label>Raison</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Expliquez la raison..."
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={confirmAction}
              variant={dialogAction === "reject" || dialogAction === "suspend" ? "destructive" : "default"}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
