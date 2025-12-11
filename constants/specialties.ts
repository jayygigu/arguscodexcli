import type { Database } from "@/types/database.types"

export type Specialty = Database["public"]["Tables"]["agency_specialties"]["Row"]["specialty"]

export const SPECIALTIES = [
  { value: "surveillance", label: "Surveillance" },
  { value: "investigation", label: "Enquête générale" },
  { value: "background-check", label: "Vérification d'antécédents" },
  { value: "fraud", label: "Enquête de fraude" },
  { value: "corporate", label: "Investigation corporative" },
  { value: "filature", label: "Filature" },
  { value: "renseignement", label: "Renseignement" },
  { value: "infiltration", label: "Infiltration" },
  { value: "gardiennage", label: "Gardiennage" },
  { value: "cyberenquete", label: "Cyberenquête" },
  { value: "audit-securite", label: "Audit de sécurité" },
  { value: "intrusion", label: "Test d'intrusion" },
  { value: "client-mystere", label: "Client mystère" },
  { value: "confirmation-physique", label: "Confirmation physique" },
  { value: "enquete-assurance", label: "Enquête d'assurance" },
  { value: "visite-pretexte", label: "Visite sous prétexte" },
  { value: "contre-surveillance", label: "Contre-surveillance" },
] as const

export const PRIORITY_LEVELS = [
  {
    value: "normal",
    label: "Normal",
    description: "Délai standard sans urgence particulière",
  },
  {
    value: "high",
    label: "Haute",
    description: "Nécessite une attention prioritaire",
  },
  {
    value: "urgent",
    label: "Urgent",
    description: "Requiert une action immédiate",
  },
] as const

export function getSpecialtyLabel(type: Specialty): string {
  const labels: Record<Specialty, string> = {
    surveillance: "Surveillance",
    investigation: "Enquête",
    "background-check": "Vérification antécédents",
    fraud: "Fraude",
    corporate: "Corporatif",
    filature: "Filature",
    renseignement: "Renseignement",
    infiltration: "Infiltration",
    gardiennage: "Gardiennage",
    cyberenquete: "Cyberenquête",
    "audit-securite": "Audit de sécurité",
    intrusion: "Intrusion",
    "client-mystere": "Client mystère",
    "confirmation-physique": "Confirmation physique",
    "enquete-assurance": "Enquête d'assurance",
    "visite-pretexte": "Visite prétexte",
    "contre-surveillance": "Contre-surveillance",
  }
  return labels[type]
}

export type MandatePriority = Database["public"]["Tables"]["mandates"]["Row"]["priority"]
export function getPriorityLabel(priority: MandatePriority): string {
  const labels: Record<MandatePriority, string> = {
    urgent: "Urgent",
    high: "Priorité haute",
    normal: "Normal",
    low: "Priorité basse",
  }
  return labels[priority]
}

export type MandateStatus = Database["public"]["Tables"]["mandates"]["Row"]["status"]
export function getStatusLabel(status: MandateStatus): string {
  const labels: Record<MandateStatus, string> = {
    pending: "En attente",
    accepted: "Accepté",
    rejected: "Refusé",
    "in-progress": "En cours",
    completed: "Complété",
  }
  return labels[status]
}
