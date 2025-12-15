"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Ban,
  RefreshCw,
  Save,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase-browser"
import { formatDistanceToNow, format } from "date-fns"
import { fr } from "date-fns/locale"
import type { VerificationStatus, VerificationAction } from "@/types/database.types"

interface AccountDetailProps {
  agency: any
  logs: any[]
  currentUserId: string
}

const statusConfig: Record<VerificationStatus, { label: string; className: string; icon: any }> = {
  pending: {
    label: "En attente de vérification",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  verified: { label: "Compte vérifié", className: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
  rejected: { label: "Compte rejeté", className: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  suspended: { label: "Compte suspendu", className: "bg-gray-50 text-gray-700 border-gray-200", icon: Ban },
  expired: { label: "Permis expiré", className: "bg-orange-50 text-orange-700 border-orange-200", icon: AlertTriangle },
}

const actionLabels: Record<VerificationAction, string> = {
  verify: "Compte vérifié",
  reject: "Compte rejeté",
  suspend: "Compte suspendu",
  unsuspend: "Compte réactivé",
  request_reverification: "Re-vérification demandée",
  update_permit: "Permis mis à jour",
  update_expiration: "Date d'expiration modifiée",
  notes_added: "Notes ajoutées",
}

export function AccountDetail({ agency, logs, currentUserId }: AccountDetailProps) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<VerificationAction | null>(null)
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState(agency.verification_notes || "")
  const [permitExpiration, setPermitExpiration] = useState(agency.permit_expiration_date || "")
  const [identityVerified, setIdentityVerified] = useState(agency.identity_verified || false)
  const [permitVerified, setPermitVerified] = useState(agency.permit_verified || false)

  const status = (agency.verification_status || "pending") as VerificationStatus
  const StatusIcon = statusConfig[status].icon

  const openDialog = (action: VerificationAction) => {
    setDialogAction(action)
    setReason("")
    setDialogOpen(true)
  }

  const executeAction = async () => {
    if (!dialogAction) return

    setLoading(true)

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
          // Keep current status but flag for re-verification
          break
      }

      // Update agency
      const updateData: any = {
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

      await supabase.from("agencies").update(updateData).eq("id", agency.id)

      // Log the action
      await supabase.from("verification_logs").insert({
        agency_id: agency.id,
        admin_id: currentUserId,
        action: dialogAction,
        previous_status: status,
        new_status: newStatus || status,
        reason: reason || null,
      })

      setDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Error executing action:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveNotes = async () => {
    setLoading(true)

    try {
      await supabase
        .from("agencies")
        .update({
          verification_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agency.id)

      await supabase.from("verification_logs").insert({
        agency_id: agency.id,
        admin_id: currentUserId,
        action: "notes_added",
        previous_status: status,
        new_status: status,
        reason: "Notes de vérification mises à jour",
      })

      router.refresh()
    } catch (error) {
      console.error("Error saving notes:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateExpiration = async () => {
    setLoading(true)

    try {
      await supabase
        .from("agencies")
        .update({
          permit_expiration_date: permitExpiration || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agency.id)

      await supabase.from("verification_logs").insert({
        agency_id: agency.id,
        admin_id: currentUserId,
        action: "update_expiration",
        previous_status: status,
        new_status: status,
        reason: `Date d'expiration mise à jour: ${permitExpiration}`,
      })

      router.refresh()
    } catch (error) {
      console.error("Error updating expiration:", error)
    } finally {
      setLoading(false)
    }
  }

  const getDialogContent = () => {
    switch (dialogAction) {
      case "verify":
        return {
          title: "Valider le compte",
          description: "Confirmez que vous avez vérifié l'identité et le permis de cette agence.",
          confirmLabel: "Valider le compte",
          confirmClass: "bg-green-600 hover:bg-green-700",
        }
      case "reject":
        return {
          title: "Rejeter le compte",
          description: "Indiquez la raison du rejet. L'agence sera notifiée.",
          confirmLabel: "Rejeter le compte",
          confirmClass: "bg-red-600 hover:bg-red-700",
        }
      case "suspend":
        return {
          title: "Suspendre le compte",
          description: "Le compte sera désactivé jusqu'à réactivation manuelle.",
          confirmLabel: "Suspendre le compte",
          confirmClass: "bg-gray-600 hover:bg-gray-700",
        }
      case "unsuspend":
        return {
          title: "Réactiver le compte",
          description: "Le compte sera réactivé et l'agence pourra se connecter.",
          confirmLabel: "Réactiver le compte",
          confirmClass: "bg-green-600 hover:bg-green-700",
        }
      case "request_reverification":
        return {
          title: "Demander une re-vérification",
          description: "L'agence devra soumettre de nouveaux documents.",
          confirmLabel: "Demander re-vérification",
          confirmClass: "bg-amber-600 hover:bg-amber-700",
        }
      default:
        return {
          title: "",
          description: "",
          confirmLabel: "",
          confirmClass: "",
        }
    }
  }

  const dialogContent = getDialogContent()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/accounts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-montserrat font-bold text-foreground">{agency.name}</h1>
              <Badge variant="outline" className={statusConfig[status].className}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig[status].label}
              </Badge>
              {agency.re_verification_required && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Re-vérification requise
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground font-urbanist mt-1">
              Inscrit {formatDistanceToNow(new Date(agency.created_at), { addSuffix: true, locale: fr })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agency Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-montserrat flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Informations de l'agence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground font-urbanist">Nom de l'agence</p>
                  <p className="font-urbanist font-medium text-foreground">{agency.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-urbanist">Numéro de permis BSP</p>
                  <p className="font-urbanist font-medium text-foreground font-mono">
                    {agency.license_number || "Non fourni"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-urbanist">Responsable</p>
                  <p className="font-urbanist font-medium text-foreground">{agency.contact_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-urbanist">Années d'activité</p>
                  <p className="font-urbanist font-medium text-foreground">
                    {agency.years_active ? `${agency.years_active} ans` : "Non spécifié"}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="font-urbanist">{agency.contact_email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span className="font-urbanist">{agency.contact_phone}</span>
                </div>
                {agency.contact_address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="font-urbanist">{agency.contact_address}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verification Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-montserrat flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Vérification du compte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={identityVerified}
                    onChange={(e) => setIdentityVerified(e.target.checked)}
                    className="w-5 h-5 rounded border-border text-primary focus:ring-primary/50"
                  />
                  <div>
                    <span className="font-urbanist font-medium text-foreground">Identité vérifiée</span>
                    <p className="text-sm text-muted-foreground">Le responsable du compte a été identifié</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permitVerified}
                    onChange={(e) => setPermitVerified(e.target.checked)}
                    className="w-5 h-5 rounded border-border text-primary focus:ring-primary/50"
                  />
                  <div>
                    <span className="font-urbanist font-medium text-foreground">Permis BSP vérifié</span>
                    <p className="text-sm text-muted-foreground">Le permis d'agence a été validé auprès du BSP</p>
                  </div>
                </label>
              </div>

              <div className="border-t border-border pt-4">
                <label className="block text-sm font-urbanist font-medium text-foreground mb-2">
                  Date d'expiration du permis
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={permitExpiration}
                    onChange={(e) => setPermitExpiration(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background font-urbanist text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Button onClick={updateExpiration} disabled={loading} variant="outline">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                </div>
                {agency.permit_expiration_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expire le {format(new Date(agency.permit_expiration_date), "d MMMM yyyy", { locale: fr })}
                  </p>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <label className="block text-sm font-urbanist font-medium text-foreground mb-2">
                  Notes de vérification
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajoutez des notes sur la vérification..."
                  className="min-h-[100px] font-urbanist"
                />
                <Button onClick={saveNotes} disabled={loading} variant="outline" className="mt-2 bg-transparent">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Sauvegarder les notes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-montserrat flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Historique des actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-muted-foreground font-urbanist text-sm text-center py-4">
                  Aucune action enregistrée
                </p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <p className="font-urbanist text-sm text-foreground">
                          {actionLabels[log.action as VerificationAction] || log.action}
                        </p>
                        {log.reason && <p className="text-xs text-muted-foreground mt-0.5">{log.reason}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-montserrat">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {status === "pending" && (
                <>
                  <Button
                    onClick={() => openDialog("verify")}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={!identityVerified || !permitVerified}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Valider le compte
                  </Button>
                  <Button onClick={() => openDialog("reject")} variant="destructive" className="w-full">
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeter le compte
                  </Button>
                </>
              )}

              {status === "verified" && (
                <>
                  <Button onClick={() => openDialog("suspend")} variant="outline" className="w-full">
                    <Ban className="w-4 h-4 mr-2" />
                    Suspendre le compte
                  </Button>
                  <Button
                    onClick={() => openDialog("request_reverification")}
                    variant="outline"
                    className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Demander re-vérification
                  </Button>
                </>
              )}

              {status === "suspended" && (
                <Button onClick={() => openDialog("unsuspend")} className="w-full bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Réactiver le compte
                </Button>
              )}

              {status === "rejected" && (
                <Button
                  onClick={() => openDialog("verify")}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!identityVerified || !permitVerified}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Valider le compte
                </Button>
              )}

              {status === "expired" && (
                <>
                  <Button
                    onClick={() => openDialog("verify")}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={!identityVerified || !permitVerified}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Revalider le compte
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Mettez à jour la date d'expiration avant de revalider
                  </p>
                </>
              )}

              {(!identityVerified || !permitVerified) && status !== "verified" && (
                <p className="text-xs text-amber-600 text-center">
                  Cochez les deux vérifications pour pouvoir valider le compte
                </p>
              )}
            </CardContent>
          </Card>

          {/* Verification Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-montserrat">Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-urbanist">Statut</span>
                <Badge variant="outline" className={statusConfig[status].className}>
                  {statusConfig[status].label.split(" ")[0]}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-urbanist">Identité</span>
                <span className={`font-urbanist font-medium ${identityVerified ? "text-green-600" : "text-amber-600"}`}>
                  {identityVerified ? "Vérifiée" : "Non vérifiée"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-urbanist">Permis BSP</span>
                <span className={`font-urbanist font-medium ${permitVerified ? "text-green-600" : "text-amber-600"}`}>
                  {permitVerified ? "Vérifié" : "Non vérifié"}
                </span>
              </div>
              {agency.verified_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-urbanist">Vérifié le</span>
                  <span className="font-urbanist">
                    {format(new Date(agency.verified_at), "d MMM yyyy", { locale: fr })}
                  </span>
                </div>
              )}
              {agency.permit_expiration_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-urbanist">Expiration</span>
                  <span className="font-urbanist">
                    {format(new Date(agency.permit_expiration_date), "d MMM yyyy", { locale: fr })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-montserrat">{dialogContent.title}</DialogTitle>
            <DialogDescription className="font-urbanist">{dialogContent.description}</DialogDescription>
          </DialogHeader>

          {(dialogAction === "reject" || dialogAction === "suspend" || dialogAction === "request_reverification") && (
            <div className="py-4">
              <label className="block text-sm font-urbanist font-medium text-foreground mb-2">
                Raison {dialogAction === "reject" && <span className="text-destructive">*</span>}
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Expliquez la raison de cette action..."
                className="min-h-[100px] font-urbanist"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={executeAction}
              disabled={loading || (dialogAction === "reject" && !reason)}
              className={dialogContent.confirmClass}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {dialogContent.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
