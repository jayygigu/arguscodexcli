"use client"

import Link from "@/components/safe-link"
import { ArrowRight, Building2, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow, format } from "date-fns"
import { fr } from "date-fns/locale"

interface AdminDashboardProps {
  stats: {
    pending: number
    verified: number
    rejected: number
    expired: number
    reverification: number
  }
  pendingAgencies: any[]
  expiringAgencies: any[]
  recentLogs: any[]
}

const actionLabels: Record<string, string> = {
  verify: "Vérifié",
  reject: "Rejeté",
  suspend: "Suspendu",
  unsuspend: "Réactivé",
  request_reverification: "Re-vérification demandée",
  update_permit: "Permis mis à jour",
  update_expiration: "Date d'expiration modifiée",
  notes_added: "Notes ajoutées",
}

export function AdminDashboard({ stats, pendingAgencies, expiringAgencies, recentLogs }: AdminDashboardProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-montserrat font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground font-urbanist mt-1">Vue d'ensemble de la gestion des comptes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Agencies */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-montserrat">Comptes en attente</CardTitle>
            <Link
              href="/admin/pending"
              className="text-sm text-primary font-urbanist hover:underline flex items-center gap-1"
            >
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {pendingAgencies.length === 0 ? (
              <p className="text-muted-foreground font-urbanist text-sm py-4 text-center">Aucun compte en attente</p>
            ) : (
              <div className="space-y-3">
                {pendingAgencies.map((agency) => (
                  <Link
                    key={agency.id}
                    href={`/admin/accounts/${agency.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-urbanist font-medium text-foreground truncate">{agency.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {agency.license_number || "Pas de permis"} •{" "}
                        {formatDistanceToNow(new Date(agency.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      En attente
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Permits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-montserrat">Permis expirant bientôt</CardTitle>
            <Link
              href="/admin/reverification"
              className="text-sm text-primary font-urbanist hover:underline flex items-center gap-1"
            >
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {expiringAgencies.length === 0 ? (
              <p className="text-muted-foreground font-urbanist text-sm py-4 text-center">
                Aucun permis expirant prochainement
              </p>
            ) : (
              <div className="space-y-3">
                {expiringAgencies.map((agency) => {
                  const expirationDate = new Date(agency.permit_expiration_date)
                  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  const isExpired = daysUntilExpiration <= 0

                  return (
                    <Link
                      key={agency.id}
                      href={`/admin/accounts/${agency.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-urbanist font-medium text-foreground truncate">{agency.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Expire le {format(expirationDate, "d MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          isExpired
                            ? "bg-red-50 text-red-700 border-red-200"
                            : daysUntilExpiration <= 7
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                        }
                      >
                        {isExpired ? "Expiré" : `${daysUntilExpiration}j`}
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-montserrat">Activité récente</CardTitle>
          <Link
            href="/admin/logs"
            className="text-sm text-primary font-urbanist hover:underline flex items-center gap-1"
          >
            Voir tout <ArrowRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-muted-foreground font-urbanist text-sm py-4 text-center">Aucune activité récente</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-urbanist text-sm text-foreground">
                      <span className="font-medium">{log.agencies?.name || "Agence inconnue"}</span>
                      {" — "}
                      <span className="text-muted-foreground">{actionLabels[log.action] || log.action}</span>
                    </p>
                    {log.reason && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{log.reason}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
