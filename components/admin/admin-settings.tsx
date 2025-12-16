"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, UserPlus, Trash2, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSupabaseClient } from "@/hooks/use-supabase-client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface AdminSettingsProps {
  currentAdmin: any
  allAdmins: any[]
  currentUserId: string
}

export function AdminSettings({ currentAdmin, allAdmins, currentUserId }: AdminSettingsProps) {
  const router = useRouter()
  const supabase = useSupabaseClient()

  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [error, setError] = useState("")

  const isSuperAdmin = currentAdmin?.role === "super_admin"

  const addAdmin = async () => {
    if (!newAdminEmail) return

    setLoading(true)
    setError("")

    try {
      // Find user by email - this would need to be done via a server action in production
      // For now, we'll show an error that this requires super admin access
      setError("Cette fonctionnalité nécessite une configuration serveur supplémentaire.")
      setLoading(false)
    } catch (err) {
      setError("Une erreur est survenue")
      setLoading(false)
    }
  }

  const removeAdmin = async (adminId: string) => {
    if (!isSuperAdmin) return

    setLoading(true)

    try {
      await supabase.from("admin_users").delete().eq("id", adminId)

      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Current Admin Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-montserrat flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Votre compte administrateur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-urbanist font-medium text-foreground">
                Rôle : {currentAdmin?.role === "super_admin" ? "Super Administrateur" : "Administrateur"}
              </p>
              <p className="text-sm text-muted-foreground font-urbanist">
                Membre depuis {format(new Date(currentAdmin?.created_at), "d MMMM yyyy", { locale: fr })}
              </p>
            </div>
            <Badge
              variant="outline"
              className={currentAdmin?.role === "super_admin" ? "bg-primary/10 text-primary" : ""}
            >
              {currentAdmin?.role === "super_admin" ? "Super Admin" : "Admin"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Admin List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-montserrat">Administrateurs</CardTitle>
          {isSuperAdmin && (
            <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Ajouter
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allAdmins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-urbanist font-medium text-foreground">
                      ID: {admin.user_id.slice(0, 8)}...
                      {admin.user_id === currentUserId && " (vous)"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                    </p>
                  </div>
                </div>
                {isSuperAdmin && admin.user_id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAdmin(admin.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {!isSuperAdmin && (
            <p className="text-sm text-muted-foreground font-urbanist mt-4 text-center">
              Seuls les super administrateurs peuvent gérer les autres administrateurs.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-montserrat">Ajouter un administrateur</DialogTitle>
            <DialogDescription className="font-urbanist">
              Entrez l'email de l'utilisateur à promouvoir administrateur.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="block text-sm font-urbanist font-medium text-foreground mb-2">
              Email de l'utilisateur
            </label>
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background font-urbanist focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {error && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                <p className="text-sm text-destructive font-urbanist">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={addAdmin} disabled={loading || !newAdminEmail}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
