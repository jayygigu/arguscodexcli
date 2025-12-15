"use client"

import { useState } from "react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Eye, MapPin, Phone, FileText, CheckCircle, Clock, XCircle, Ban } from "lucide-react"

interface Investigator {
  id: string
  name: string
  email?: string
  phone?: string
  license_number?: string
  city?: string
  region?: string
  verification_status?: string
  verified_at?: string
  created_at: string
  years_experience?: number
  availability_status?: string
}

interface InvestigatorsTableProps {
  investigators: Investigator[]
}

const statusConfig = {
  pending: {
    label: "En attente",
    variant: "outline" as const,
    icon: Clock,
    color: "text-amber-500",
  },
  verified: {
    label: "Vérifié",
    variant: "default" as const,
    icon: CheckCircle,
    color: "text-emerald-500",
  },
  rejected: {
    label: "Rejeté",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-red-500",
  },
  suspended: {
    label: "Suspendu",
    variant: "secondary" as const,
    icon: Ban,
    color: "text-gray-500",
  },
}

export function InvestigatorsTable({ investigators }: InvestigatorsTableProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredInvestigators = investigators.filter((inv) => {
    const matchesSearch =
      inv.name.toLowerCase().includes(search.toLowerCase()) ||
      inv.email?.toLowerCase().includes(search.toLowerCase()) ||
      inv.license_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.city?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === "all" || inv.verification_status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="font-urbanist">
            {filteredInvestigators.length} enquêteur{filteredInvestigators.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, permis, ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="verified">Vérifié</SelectItem>
              <SelectItem value="rejected">Rejeté</SelectItem>
              <SelectItem value="suspended">Suspendu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Enquêteur</TableHead>
              <TableHead>N° Permis</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Expérience</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvestigators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun enquêteur trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredInvestigators.map((inv) => {
                const status =
                  statusConfig[inv.verification_status as keyof typeof statusConfig] || statusConfig.pending
                const StatusIcon = status.icon

                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inv.name}</p>
                        {inv.email && <p className="text-sm text-muted-foreground">{inv.email}</p>}
                        {inv.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {inv.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {inv.license_number ? (
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{inv.license_number}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Non renseigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {inv.city || inv.region ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{[inv.city, inv.region].filter(Boolean).join(", ")}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Non renseigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {inv.years_experience !== undefined ? (
                        <span className="text-sm">
                          {inv.years_experience} an{inv.years_experience !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="gap-1">
                        <StatusIcon className={`w-3 h-3 ${status.color}`} />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/investigators/${inv.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
