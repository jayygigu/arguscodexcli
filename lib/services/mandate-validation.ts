import type { Database } from "@/types/database.types"
import { createClient } from "@/lib/supabase-server"
import { canTransition } from "@/lib/workflow-transitions"

type Mandate = Database["public"]["Tables"]["mandates"]["Row"]

export class MandateValidationService {
  static async validateAssignment(
    mandateId: string,
    investigatorId: string,
  ): Promise<{
    valid: boolean
    reason?: string
  }> {
    const supabase = await createClient()

    const { data: mandate } = await supabase.from("mandates").select("*").eq("id", mandateId).maybeSingle()

    if (!mandate) {
      return { valid: false, reason: "Mandat introuvable" }
    }

    if (mandate.assigned_to && mandate.assigned_to !== investigatorId) {
      return { valid: false, reason: "Ce mandat est déjà assigné à un autre enquêteur" }
    }

    if (mandate.status === "completed") {
      return { valid: false, reason: "Ce mandat est déjà complété" }
    }

    if (mandate.status === "cancelled") {
      return { valid: false, reason: "Ce mandat a été annulé" }
    }

    if (mandate.status === "expired") {
      return { valid: false, reason: "Ce mandat a expiré" }
    }

    const { data: investigator } = await supabase
      .from("profiles")
      .select("id, name, availability_status")
      .eq("id", investigatorId)
      .maybeSingle()

    if (!investigator) {
      return { valid: false, reason: "Enquêteur introuvable" }
    }

    if (investigator.availability_status === "unavailable") {
      return { valid: false, reason: `${investigator.name || "Cet enquêteur"} n'est pas disponible actuellement` }
    }

    if (!mandate.date_required) {
      return {
        valid: false,
        reason: "La date requise du mandat doit être spécifiée avant l'assignation",
      }
    }

    const mandateDate = new Date(mandate.date_required)
    const { data: unavailableDates } = await supabase
      .from("unavailable_dates")
      .select("date")
      .eq("profile_id", investigatorId)

    if (unavailableDates && unavailableDates.length > 0) {
      const hasConflict = unavailableDates.some((ud) => {
        const unavailableDate = new Date(ud.date)
        return unavailableDate.toDateString() === mandateDate.toDateString()
      })

      if (hasConflict) {
        return {
          valid: false,
          reason: `${investigator.name || "L'enquêteur"} n'est pas disponible à la date requise (${mandateDate.toLocaleDateString("fr-FR")})`,
        }
      }
    }

    const { count: inProgressCount } = await supabase
      .from("mandates")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", investigatorId)
      .eq("status", "in-progress")

    if (inProgressCount && inProgressCount >= 5) {
      return {
        valid: false,
        reason: `${investigator.name || "Cet enquêteur"} a déjà 5 mandats en cours. Veuillez attendre qu'il en termine avant de l'assigner.`,
      }
    }

    return { valid: true }
  }

  static validateDates(
    dateRequired: string,
    duration: string,
  ): {
    valid: boolean
    reason?: string
  } {
    const requiredDate = new Date(dateRequired)
    const now = new Date()

    if (requiredDate < now) {
      return { valid: false, reason: "La date requise doit être dans le futur" }
    }

    const minDelay = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    if (requiredDate < minDelay) {
      return { valid: false, reason: "Un délai minimum de 24h est requis" }
    }

    return { valid: true }
  }

  static validateStatusTransition(
    currentStatus: Mandate["status"],
    newStatus: Mandate["status"],
    hasAssignedInvestigator: boolean,
  ): {
    valid: boolean
    reason?: string
  } {
    if (!canTransition(currentStatus, newStatus)) {
      return {
        valid: false,
        reason: `Transition invalide: ${currentStatus} → ${newStatus}`,
      }
    }

    if (newStatus === "in-progress" && !hasAssignedInvestigator) {
      return {
        valid: false,
        reason: "Un enquêteur doit être assigné pour passer le mandat en cours",
      }
    }

    if (newStatus === "open" && hasAssignedInvestigator) {
      return {
        valid: false,
        reason: "Désassignez l'enquêteur avant de rouvrir le mandat",
      }
    }

    return { valid: true }
  }
}
