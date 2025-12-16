"use client"

import { useState, useMemo } from "react"
import Link from "@/components/safe-link"
import { Search, Filter, Building2, ChevronDown, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatDistanceToNow, format } from "date-fns"
import { fr } from "date-fns/locale"
import type { VerificationStatus } from "@/types/database.types"

interface AccountsTableProps {
  agencies: any[]
  defaultFilter?: VerificationStatus
}

const statusConfig: Record<VerificationStatus, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-amber-50 text-amber-700 border-amber-200" },
  verified: { label: "Vérifié", className: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejeté", className: "bg-red-50 text-red-700 border-red-200" },
  suspended: { label: "Suspendu", className: "bg-gray-50 text-gray-700 border-gray-200" },
  expired: { label: "Expiré", className: "bg-orange-50 text-orange-700 border-orange-200" },
}

export function AccountsTable({ agencies, defaultFilter }: AccountsTableProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "all">(defaultFilter || "all")

  const filteredAgencies = useMemo(() => {
    return agencies.filter((agency) => {
      const matchesSearch =
        agency.name?.toLowerCase().includes(search.toLowerCase()) ||
        agency.license_number?.toLowerCase().includes(search.toLowerCase()) ||
        agency.contact_email?.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === "all" || agency.verification_status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [agencies, search, statusFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, permis ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background font-urbanist text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Filter className="w-4 h-4" />
              {statusFilter === "all" ? "Tous les statuts" : statusConfig[statusFilter].label}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>Tous les statuts</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("pending")}>En attente</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("verified")}>Vérifié</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("rejected")}>Rejeté</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("suspended")}>Suspendu</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("expired")}>Expiré</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground font-urbanist">
        {filteredAgencies.length} compte{filteredAgencies.length !== 1 ? "s" : ""} trouvé
        {filteredAgencies.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-urbanist font-semibold text-sm text-foreground">Agence</th>
                  <th className="text-left p-4 font-urbanist font-semibold text-sm text-foreground">Permis BSP</th>
                  <th className="text-left p-4 font-urbanist font-semibold text-sm text-foreground">Statut</th>
                  <th className="text-left p-4 font-urbanist font-semibold text-sm text-foreground">Expiration</th>
                  <th className="text-left p-4 font-urbanist font-semibold text-sm text-foreground">Inscrit le</th>
                  <th className="text-right p-4 font-urbanist font-semibold text-sm text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgencies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground font-urbanist">
                      Aucun compte trouvé
                    </td>
                  </tr>
                ) : (
                  filteredAgencies.map((agency) => {
                    const status = (agency.verification_status || "pending") as VerificationStatus

                    return (
                      <tr
                        key={agency.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-urbanist font-medium text-foreground">{agency.name}</p>
                              <p className="text-sm text-muted-foreground">{agency.contact_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-urbanist text-foreground font-mono text-sm">
                            {agency.license_number || "—"}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={statusConfig[status].className}>
                              {statusConfig[status].label}
                            </Badge>
                            {agency.re_verification_required && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                Re-vérif.
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-urbanist text-sm text-foreground">
                            {agency.permit_expiration_date
                              ? format(new Date(agency.permit_expiration_date), "d MMM yyyy", { locale: fr })
                              : "—"}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-urbanist text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(agency.created_at), { addSuffix: true, locale: fr })}
                          </p>
                        </td>
                        <td className="p-4 text-right">
                          <Link href={`/admin/accounts/${agency.id}`}>
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
