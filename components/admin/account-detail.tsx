"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Save,
  Ban,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase-browser"
import { toast } from "@/hooks/use-toast"

type VerificationStatus = "pending" | "verified" | "rejected" | "suspended"

interface Agency {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
  siret?: string
  license_number?: string
  created_at: string
  verification_status?: VerificationStatus
  verified_at?: string
  verified_by?: string
  rejection_reason?: string
  identity_verified?: boolean
  permit_verified?: boolean
  permit_expiration_date?: string
  verification_notes?: string
  re_verification_required?: boolean
  re_verification_reason?: string
  last_verification_date?: string
}

interface AccountDetailProps {
  agency: Agency
  currentUserId: string
}

export function AccountDetail({ agency, currentUserId }: AccountDetailProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState(agency.verification_notes || "")
  const [permitExpiration, setPermitExpiration] = useState(agency.permit_expiration_date || "")
  const [identityVerified, setIdentityVerified] = useState(agency.identity_verified || false)
  const [permitVerified, setPermitVerified] = useState(agency.permit_verified || false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<string | null>(null)
  const [reason, setReason] = useState("")

  const status = (agency.verification_status || "pending") as VerificationStatus

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
          newStatus = "verified"
          break
        case "reject":
          newStatus = "rejected"
          break
        case "suspend":
          newStatus = "suspended"
          break
        case "unsuspend":
          newStatus = "verified"
          break
        case "request_reverification":
          break
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (newStatus) {
        updateData.verification_status = newStatus
      }

      if (dialogAction === "verify") {
        updateData.verified_at = new Date().toISOString()
        updateData.verified_by = currentUserId
        updateData.last_verification_date = new Date().toISOString()
        updateData.re_verification_required = false
        updateData.identity_verified = identityVerified
        updateData.permit_verified = permitVerified
        updateData.permit_expiration_date = permitExpiration || null
      }

      if (dialogAction === "reject") {
        updateData.rejection_reason = reason
      }

      if (dialogAction === "request_reverification") {
        updateData.re_verification_required = true
        updateData.re_verification_reason = reason
      }

      const { error: updateError } = await supabase.from("agencies").update(updateData).eq("id", agency.id)

      if (updateError) {
        console.error("[v0] Agency update error:", updateError)
        toast({
          title: "Erreur",
          description: `Impossible de mettre à jour l'agence: ${updateError.message}`,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const { error: logError } = await supabase.from("verification_logs").insert({
        agency_id: agency.id,
        admin_id: currentUserId,
        action: dialogAction,
        previous_status: status,
        new_status: newStatus || status,
        reason: reason || null,
      })

      if (logError) {
        console.error("[v0] Verification log error:", logError)
        // Non-blocking error - just log it
      }

      toast({
        title: "Succès",
        description: getSuccessMessage(dialogAction),
      })

      router.refresh()
    } catch (error) {
      console.error("[v0] Verification error:", error)
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getSuccessMessage = (action: string | null): string => {
    switch (action) {
      case "verify":
        return "Le compte a été vérifié avec succès"
      case "reject":
        return "Le compte a été rejeté"
      case "suspend":
        return "Le compte a été suspendu"
      case "unsuspend":
        return "Le compte a été réactivé"
      case "request_reverification":
        return "Demande de re-vérification envoyée"
      default:
        return "Action effectuée avec succès"
    }
  }

  const saveNotes = async () => {
    setLoading(true)

    try {
      const { error: updateError } = await supabase
        .from("agencies")
        .update({
          verification_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agency.id)

      if (updateError) {
        console.error("[v0] Notes save error:", updateError)
        toast({
          title: "Erreur",
          description: `Impossible de sauvegarder les notes: ${updateError.message}`,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      await supabase.from("verification_logs").insert({
        agency_id: agency.id,
        admin_id: currentUserId,
        action: "notes_added",
        previous_status: status,
        new_status: status,
        reason: "Notes de vérification mises à jour",
      })

      toast({
        title: "Succès",
        description: "Notes sauvegardées",
      })

      router.refresh()
    } catch (error) {
      console.error("[v0] Error saving notes:", error)
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateExpiration = async () => {
    setLoading(true)

    try {
      const { error: updateError } = await supabase
        .from("agencies")
        .update({
          permit_expiration_date: permitExpiration || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agency.id)

      if (updateError) {
        console.error("[v0] Expiration update error:", updateError)
        toast({
          title: "Erreur",
          description: `Impossible de mettre à jour l'expiration: ${updateError.message}`,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      await supabase.from("verification_logs").insert({
        agency_id: agency.id,
        admin_id: currentUserId,
        action: "update_expiration",
        previous_status: status,
        new_status: status,
        reason: `Date d'expiration mise à jour: ${permitExpiration || "Non définie"}`,
      })

      toast({
        title: "Succès",
        description: "Date d'expiration mise à jour",
      })

      router.refresh()
    } catch (error) {
      console.error("[v0] Error updating expiration:", error)
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (s: VerificationStatus) => {
    switch (s) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Vérifié
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeté
          </Badge>
        )
      case "suspended":
        return (
          <Badge className="bg-orange-100 text-orange-800">
            <Ban className="w-3 h-3 mr-1" />
            Suspendu
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        )
    }
  }

  const getDialogContent = () => {
    switch (dialogAction) {
      case "verify":
        return {
          title: "Vérifier ce compte",
          description: "Confirmez-vous la vérification de ce compte agence ?",
          showReason: false,
          showChecks: true,
        }
      case "reject":
        return {
          title: "Rejeter ce compte",
          description: "Veuillez indiquer la raison du rejet.",
          showReason: true,
          showChecks: false,
        }
      case "suspend":
        return {
          title: "Suspendre ce compte",
          description: "Veuillez indiquer la raison de la suspension.",
          showReason: true,
          showChecks: false,
        }
      case "unsuspend":
        return {
          title: "Réactiver ce compte",
          description: "Confirmez-vous la réactivation de ce compte ?",
          showReason: false,
          showChecks: false,
        }
      case "request_reverification":
        return {
          title: "Demander une re-vérification",
          description: "Veuillez indiquer la raison de la demande de re-vérification.",
          showReason: true,
          showChecks: false,
        }
      default:
        return {
          title: "",
          description: "",
          showReason: false,
          showChecks: false,
        }
    }
  }

  const dialogContent = getDialogContent()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">{agency.name}</h1>
        {getStatusBadge(status)}
        {agency.re_verification_required && (
          <Badge variant="outline" className="border-orange-500 text-orange-500">
            <RefreshCw className="w-3 h-3 mr-1" />
            Re-vérification requise
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{agency.email}</span>
            </div>
            {agency.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{agency.phone}</span>
              </div>
            )}
            {agency.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>
                  {agency.address}
                  {agency.city && `, ${agency.city}`}
                  {agency.postal_code && ` ${agency.postal_code}`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Inscrit le {new Date(agency.created_at).toLocaleDateString("fr-FR")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Documents légaux */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents légaux
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {agency.siret && (
              <div>
                <Label className="text-muted-foreground">SIRET</Label>
                <p className="font-mono">{agency.siret}</p>
              </div>
            )}
            {agency.license_number && (
              <div>
                <Label className="text-muted-foreground">Numéro de licence</Label>
                <p className="font-mono">{agency.license_number}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Date d&apos;expiration de l&apos;agrément</Label>
              <div className="flex gap-2">
                <Input type="date" value={permitExpiration} onChange={(e) => setPermitExpiration(e.target.value)} />
                <Button onClick={updateExpiration} disabled={loading} size="sm">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vérification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Vérification
            </CardTitle>
            <CardDescription>État de la vérification du compte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="identity"
                checked={identityVerified}
                onCheckedChange={(checked) => setIdentityVerified(checked as boolean)}
              />
              <Label htmlFor="identity">Identité vérifiée</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="permit"
                checked={permitVerified}
                onCheckedChange={(checked) => setPermitVerified(checked as boolean)}
              />
              <Label htmlFor="permit">Agrément vérifié</Label>
            </div>

            {agency.verified_at && (
              <div className="text-sm text-muted-foreground">
                Vérifié le {new Date(agency.verified_at).toLocaleDateString("fr-FR")}
              </div>
            )}

            {agency.rejection_reason && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Raison du rejet:</strong> {agency.rejection_reason}
                </p>
              </div>
            )}

            {agency.re_verification_reason && (
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Raison re-vérification:</strong> {agency.re_verification_reason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes admin */}
        <Card>
          <CardHeader>
            <CardTitle>Notes de vérification</CardTitle>
            <CardDescription>Notes internes visibles uniquement par les admins</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ajouter des notes sur cette agence..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
            <Button onClick={saveNotes} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Sauvegarder les notes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Actions administratives sur ce compte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {status === "pending" && (
              <>
                <Button onClick={() => openDialog("verify")} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Vérifier le compte
                </Button>
                <Button onClick={() => openDialog("reject")} variant="destructive">
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeter
                </Button>
              </>
            )}

            {status === "verified" && (
              <>
                <Button
                  onClick={() => openDialog("suspend")}
                  variant="outline"
                  className="border-orange-500 text-orange-500 hover:bg-orange-50"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Suspendre
                </Button>
                <Button onClick={() => openDialog("request_reverification")} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Demander re-vérification
                </Button>
              </>
            )}

            {status === "suspended" && (
              <Button onClick={() => openDialog("unsuspend")} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Réactiver le compte
              </Button>
            )}

            {status === "rejected" && (
              <Button onClick={() => openDialog("verify")} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Vérifier le compte
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmation */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogContent.title}</DialogTitle>
            <DialogDescription>{dialogContent.description}</DialogDescription>
          </DialogHeader>

          {dialogContent.showChecks && (
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dialog-identity"
                  checked={identityVerified}
                  onCheckedChange={(checked) => setIdentityVerified(checked as boolean)}
                />
                <Label htmlFor="dialog-identity">Identité vérifiée</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dialog-permit"
                  checked={permitVerified}
                  onCheckedChange={(checked) => setPermitVerified(checked as boolean)}
                />
                <Label htmlFor="dialog-permit">Agrément vérifié</Label>
              </div>
            </div>
          )}

          {dialogContent.showReason && (
            <div className="py-4">
              <Label htmlFor="reason">Raison</Label>
              <Textarea
                id="reason"
                placeholder="Expliquez la raison..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-2"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={confirmAction}
              disabled={loading || (dialogContent.showReason && !reason.trim())}
              className={
                dialogAction === "verify" || dialogAction === "unsuspend" ? "bg-green-600 hover:bg-green-700" : ""
              }
              variant={dialogAction === "reject" || dialogAction === "suspend" ? "destructive" : "default"}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
