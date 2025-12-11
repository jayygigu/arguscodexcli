"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { MandateValidationService } from "@/lib/services/mandate-validation"
import { NotificationService } from "@/lib/services/notification-service"
import { NAVIGATION_FLOWS } from "@/lib/navigation-utils"

export async function acceptCandidatureAction(candidatureId: string, mandateId: string, investigatorId: string) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const validation = await MandateValidationService.validateAssignment(mandateId, investigatorId)
    if (!validation.valid) {
      return { success: false, error: validation.reason || "Impossible d'assigner cet enquêteur" }
    }

    const { data: mandate } = await supabase
      .from("mandates")
      .select("agency_id, status, assigned_to, title")
      .eq("id", mandateId)
      .single()

    if (!mandate) {
      return { success: false, error: "Mandat introuvable" }
    }

    const { data: agency } = await supabase.from("agencies").select("id").eq("owner_id", user.id).single()

    if (!agency || agency.id !== mandate.agency_id) {
      return { success: false, error: "Non autorisé" }
    }

    const { error: acceptError } = await supabase
      .from("mandate_interests")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", candidatureId)

    if (acceptError) {
      console.error("Error accepting candidature:", acceptError)
      return { success: false, error: "Impossible d'accepter la candidature" }
    }

    const { error: assignError } = await supabase
      .from("mandates")
      .update({
        assigned_to: investigatorId,
        status: "in-progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", mandateId)

    if (assignError) {
      console.error("Error assigning investigator:", assignError)
      await supabase.from("mandate_interests").update({ status: "interested" }).eq("id", candidatureId)
      return { success: false, error: "Impossible d'assigner l'enquêteur" }
    }

    const { error: expireError } = await supabase
      .from("mandate_interests")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("mandate_id", mandateId)
      .neq("id", candidatureId)
      .eq("status", "interested")

    if (expireError) {
      console.error("Error expiring other candidatures:", expireError)
    }

    await NotificationService.notifyCandidatureAccepted(investigatorId, mandateId, mandate.title)

    revalidatePath("/agence/candidatures")
    revalidatePath("/agence/mandats")
    revalidatePath(`/agence/mandats/${mandateId}`)
    revalidatePath("/agence/dashboard")
    revalidatePath("/agence/enqueteurs")
    revalidatePath(`/agence/enqueteurs/${investigatorId}`)

    return {
      success: true,
      redirectUrl: NAVIGATION_FLOWS.afterAcceptCandidature(mandateId),
    }
  } catch (error: any) {
    console.error("Error in acceptCandidatureAction:", error)
    return { success: false, error: error.message || "Une erreur est survenue" }
  }
}

export async function rejectCandidatureAction(candidatureId: string) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data: candidature } = await supabase
      .from("mandate_interests")
      .select("mandate_id, investigator_id, mandates!inner(agency_id, title)")
      .eq("id", candidatureId)
      .single()

    if (!candidature) {
      return { success: false, error: "Candidature introuvable" }
    }

    const { data: agency } = await supabase.from("agencies").select("id").eq("owner_id", user.id).single()

    if (!agency || agency.id !== candidature.mandates.agency_id) {
      return { success: false, error: "Non autorisé" }
    }

    const { error } = await supabase
      .from("mandate_interests")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", candidatureId)

    if (error) {
      console.error("Error rejecting candidature:", error)
      return { success: false, error: "Impossible de refuser la candidature" }
    }

    await NotificationService.notifyCandidatureRejected(
      candidature.investigator_id,
      candidature.mandate_id,
      candidature.mandates.title,
    )

    revalidatePath("/agence/candidatures")
    revalidatePath("/agence/mandats")
    revalidatePath(`/agence/mandats/${candidature.mandate_id}`)
    revalidatePath("/agence/dashboard")

    return { success: true }
  } catch (error: any) {
    console.error("Error in rejectCandidatureAction:", error)
    return { success: false, error: error.message || "Une erreur est survenue" }
  }
}

export async function unassignInvestigatorAction(mandateId: string) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data: mandate } = await supabase
      .from("mandates")
      .select("agency_id, status, assigned_to, title")
      .eq("id", mandateId)
      .single()

    if (!mandate) {
      return { success: false, error: "Mandat introuvable" }
    }

    if (!mandate.assigned_to) {
      return { success: false, error: "Aucun enquêteur n'est assigné à ce mandat" }
    }

    if (mandate.status === "completed") {
      return { success: false, error: "Impossible de désassigner un enquêteur d'un mandat complété" }
    }

    const { data: agency } = await supabase.from("agencies").select("id").eq("owner_id", user.id).single()

    if (!agency || agency.id !== mandate.agency_id) {
      return { success: false, error: "Non autorisé" }
    }

    const previousInvestigatorId = mandate.assigned_to

    const { error: unassignError } = await supabase
      .from("mandates")
      .update({
        assigned_to: null,
        status: "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", mandateId)

    if (unassignError) {
      console.error("Error unassigning investigator:", unassignError)
      return { success: false, error: "Impossible de retirer l'assignation" }
    }

    const { error: resetError } = await supabase
      .from("mandate_interests")
      .update({ status: "interested", updated_at: new Date().toISOString() })
      .eq("mandate_id", mandateId)
      .in("status", ["accepted", "rejected"])

    if (resetError) {
      console.error("Error resetting candidatures:", resetError)
    }

    await NotificationService.notifyInvestigatorUnassigned(previousInvestigatorId, mandateId, mandate.title)

    revalidatePath("/agence/candidatures")
    revalidatePath("/agence/mandats")
    revalidatePath(`/agence/mandats/${mandateId}`)
    revalidatePath("/agence/dashboard")
    revalidatePath("/agence/enqueteurs")
    revalidatePath("/agence/enqueteurs/compare")

    return { success: true }
  } catch (error: any) {
    console.error("Error in unassignInvestigatorAction:", error)
    return { success: false, error: error.message || "Une erreur est survenue" }
  }
}

export async function completeMandateAction(mandateId: string) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data: mandate } = await supabase
      .from("mandates")
      .select("agency_id, assigned_to, status, title")
      .eq("id", mandateId)
      .single()

    if (!mandate) {
      return { success: false, error: "Mandat introuvable" }
    }

    if (!mandate.assigned_to) {
      return { success: false, error: "Impossible de terminer un mandat sans enquêteur assigné" }
    }

    if (mandate.status !== "in-progress") {
      return { success: false, error: "Seuls les mandats en cours peuvent être marqués comme terminés" }
    }

    const { data: agency } = await supabase.from("agencies").select("id, owner_id").eq("owner_id", user.id).single()

    if (!agency || agency.id !== mandate.agency_id) {
      return { success: false, error: "Non autorisé" }
    }

    const { error } = await supabase
      .from("mandates")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", mandateId)

    if (error) {
      console.error("Error completing mandate:", error)
      return { success: false, error: "Impossible de marquer le mandat comme terminé" }
    }

    await NotificationService.notifyMandateCompleted(agency.owner_id, mandateId, mandate.title)

    revalidatePath("/agence/mandats")
    revalidatePath(`/agence/mandats/${mandateId}`)
    revalidatePath("/agence/dashboard")
    revalidatePath("/agence/enqueteurs")
    revalidatePath("/agence/enqueteurs/compare")

    return {
      success: true,
      redirectUrl: NAVIGATION_FLOWS.afterCompleteMandate(mandateId, mandate.assigned_to),
    }
  } catch (error: any) {
    console.error("Error in completeMandateAction:", error)
    return { success: false, error: error.message || "Une erreur est survenue" }
  }
}

export async function reopenMandateAction(mandateId: string) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { data: mandate } = await supabase
      .from("mandates")
      .select("agency_id, assigned_to, status, title")
      .eq("id", mandateId)
      .single()

    if (!mandate) {
      return { success: false, error: "Mandat introuvable" }
    }

    if (mandate.status !== "completed") {
      return { success: false, error: "Seuls les mandats terminés peuvent être rouverts" }
    }

    const { data: agency } = await supabase.from("agencies").select("id").eq("owner_id", user.id).single()

    if (!agency || agency.id !== mandate.agency_id) {
      return { success: false, error: "Non autorisé" }
    }

    const newStatus = mandate.assigned_to ? "in-progress" : "open"

    const { error } = await supabase
      .from("mandates")
      .update({
        status: newStatus,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mandateId)

    if (error) {
      console.error("Error reopening mandate:", error)
      return { success: false, error: "Impossible de rouvrir le mandat" }
    }

    revalidatePath("/agence/mandats")
    revalidatePath(`/agence/mandats/${mandateId}`)
    revalidatePath("/agence/dashboard")
    revalidatePath("/agence/enqueteurs")
    revalidatePath("/agence/enqueteurs/compare")

    return { success: true }
  } catch (error: any) {
    console.error("Error in reopenMandateAction:", error)
    return { success: false, error: error.message || "Une erreur est survenue" }
  }
}
