"use client"

import { useState } from "react"
import Link from "next/link"
import { Filter, ChevronDown, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { VerificationAction } from "@/types/database.types"

interface AuditLogsProps {
  logs: any[]
}

const actionLabels: Record<VerificationAction, { label: string; className: string }> = {
  verify: { label: "Vérifié", className: "bg-green-50 text-green-700 border-green-200" },
  reject: { label: "Rejeté", className: "bg-red-50 text-red-700 border-red-200" },
  suspend: { label: "Suspendu", className: "bg-gray-50 text-gray-700 border-gray-200" },
  unsuspend: { label: "Réactivé", className: "bg-green-50 text-green-700 border-green-200" },
  request_reverification: { label: "Re-vérification", className: "bg-amber-50 text-amber-700 border-amber-200" },
  update_permit: { label: "Permis mis à jour", className: "bg-blue-50 text-blue-700 border-blue-200" },
  update_expiration: { label: "Expiration modifiée", className: "bg-blue-50 text-blue-700 border-blue-200" },
  notes_added: { label: "Notes ajoutées", className: "bg-gray-50 text-gray-700 border-gray-200" },
}

export function AuditLogs({ logs }: AuditLogsProps) {
  const [actionFilter, setActionFilter] = useState<VerificationAction | "all">("all")

  const filteredLogs = actionFilter === "all" ? logs : logs.filter((log) => log.action === actionFilter)

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Filter className="w-4 h-4" />
              {actionFilter === "all" ? "Toutes les actions" : actionLabels[actionFilter].label}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setActionFilter("all")}>Toutes les actions</DropdownMenuItem>
            {Object.entries(actionLabels).map(([key, value]) => (
              <DropdownMenuItem key={key} onClick={() => setActionFilter(key as VerificationAction)}>
                {value.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-urbanist font-semibold text-sm text-foreground">Date</th>
                  <th className="text-left p-4 font-urbanist font-semibold text-sm text-foreground">Agence</th>
                  <th className="text-left p-4 font-urbanist font-semibold text-sm text-foreground">Action</th>
                  <th className="text-left p-4 font-urbanist font-semibold text-sm text-foreground">Changement</th>
                  <th className="text-left p-4 font-urbanist font-semibold text-sm text-foreground">Raison</th>
                  <th className="text-right p-4 font-urbanist font-semibold text-sm text-foreground">Détails</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground font-urbanist">
                      Aucun log trouvé
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const action = log.action as VerificationAction
                    const actionConfig = actionLabels[action] || {
                      label: action,
                      className: "bg-gray-50 text-gray-700 border-gray-200",
                    }

                    return (
                      <tr
                        key={log.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4">
                          <p className="font-urbanist text-sm text-foreground">
                            {format(new Date(log.created_at), "d MMM yyyy", { locale: fr })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "HH:mm", { locale: fr })}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-urbanist font-medium text-foreground">
                            {log.agencies?.name || "Agence inconnue"}
                          </p>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={actionConfig.className}>
                            {actionConfig.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {log.previous_status && log.new_status && log.previous_status !== log.new_status ? (
                            <p className="font-urbanist text-sm text-muted-foreground">
                              {log.previous_status} → {log.new_status}
                            </p>
                          ) : (
                            <p className="font-urbanist text-sm text-muted-foreground">—</p>
                          )}
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="font-urbanist text-sm text-muted-foreground line-clamp-2">
                            {log.reason || "—"}
                          </p>
                        </td>
                        <td className="p-4 text-right">
                          <Link href={`/admin/accounts/${log.agency_id}`}>
                            <Button variant="ghost" size="sm" className="gap-1">
                              Voir
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
