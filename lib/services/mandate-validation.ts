import type { Database } from "@/types/database.types"
import { createClient } from "@/lib/supabase-server"

type Mandate = Database["public"]["Tables"]["mandates"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export class MandateValidationService {
  /**
   * Valide qu'un enquêteur peut être assigné à un mandat
   */
  static async validateAssignment(
    mandateId: string,
    investigatorId: string,
  ): Promise<{
    valid: boolean
    reason?: string
  }> {
    const supabase = await createClient()

    // Vérifier que le mandat existe et n'est pas déjà assigné
    const { data: mandate } = await supabase.from("mandates").select("*").eq("id", mandateId).single()

    if (!mandate) {
      return { valid: false, reason: "Mandat introuvable" }
    }

    if (mandate.assigned_to && mandate.assigned_to !== investigatorId) {
      return { valid: false, reason: "Mandat déjà assigné à un autre enquêteur" }
    }

    if (mandate.status === "completed" || mandate.status === "cancelled") {
      return { valid: false, reason: `Mandat déjà ${mandate.status === "completed" ? "complété" : "annulé"}` }
    }

    // Vérifier que l'enquêteur existe
    const { data: investigator } = await supabase.from("profiles").select("*").eq("id", investigatorId).single()

    if (!investigator) {
      return { valid: false, reason: "Enquêteur introuvable" }
    }

    // Vérifier la disponibilité de l'enquêteur
    const mandateDate = new Date(mandate.date_required)
    const { data: unavailableDates } = await supabase
      .from("unavailable_dates")
      .select("date")
      .eq("profile_id", investigatorId)
      .gte("date", mandateDate.toISOString().split("T")[0])

    if (unavailableDates && unavailableDates.length > 0) {
      const hasConflict = unavailableDates.some((ud) => new Date(ud.date).toDateString() === mandateDate.toDateString())
      if (hasConflict) {
        return { valid: false, reason: "L'enquêteur n'est pas disponible à cette date" }
      }
    }

    return { valid: true }
  }

  /**
   * Valide les dates d'un mandat
   */
  static validateDates(
    dateRequired: string,
    duration: string,
  ): {
    valid: boolean
    reason?: string
  } {
    const requiredDate = new Date(dateRequired)
    const now = new Date()

    // La date requise doit être dans le futur
    if (requiredDate < now) {
      return { valid: false, reason: "La date requise doit être dans le futur" }
    }

    // Vérifier qu'il y a un délai minimal (24h)
    const minDelay = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    if (requiredDate < minDelay) {
      return { valid: false, reason: "Un délai minimum de 24h est requis" }
    }

    return { valid: true }
  }

  /**
   * Valide qu'un mandat peut changer de statut
   */
  static validateStatusTransition(
    currentStatus: Mandate["status"],
    newStatus: Mandate["status"],
    hasAssignedInvestigator: boolean,
  ): {
    valid: boolean
    reason?: string
  } {
    const validTransitions: Record<Mandate["status"], Mandate["status"][]> = {
      open: ["assigned", "cancelled", "expired"],
      assigned: ["in-progress", "open", "cancelled"],
      "in-progress": ["completed", "cancelled"],
      completed: [], // Pas de transition depuis completed
      cancelled: [], // Pas de transition depuis cancelled
      expired: ["open"], // Peut être rouvert
    }

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        valid: false,
        reason: `Transition invalide: ${currentStatus} → ${newStatus}`,
      }
    }

    // Vérifications supplémentaires
    if (newStatus === "assigned" || newStatus === "in-progress") {
      if (!hasAssignedInvestigator) {
        return {
          valid: false,
          reason: "Un enquêteur doit être assigné pour ce statut",
        }
      }
    }

    if (newStatus === "open" && hasAssignedInvestigator) {
      return {
        valid: false,
        reason: "Le mandat ne peut pas être 'open' avec un enquêteur assigné",
      }
    }

    return { valid: true }
  }
}
