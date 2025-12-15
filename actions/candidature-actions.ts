"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { MandateValidationService } from "@/lib/services/mandate-validation"
import { NotificationService } from "@/lib/services/notification-service"
import { NAVIGATION_FLOWS } from "@/lib/navigation-utils"

function revalidateMandatePaths(mandateId: string, investigatorId?: string) {
  revalidatePath(`/agence/mandats/${mandateId}`)
  revalidatePath("/agence/mandats")
  revalidatePath("/agence/dashboard")
  revalidatePath("/agence/candidatures")

  if (investigatorId) {
    revalidatePath(`/agence/enqueteurs/${investigatorId}`)
    revalidatePath("/agence/enqueteurs")
  }
}

async function validateAgencyOwnership(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  agencyId: string,
): Promise<{ valid: boolean; error?: string }> {
  const { data: agency } = await supabase
    .from("agencies")
    .select("id")
    .eq("owner_id", userId)
    .eq("id", agencyId)
    .maybeSingle()

  if (!agency) {
    return { valid: false, error: "Non autorisé" }
  }
  return { valid: true }
}

export async function acceptCandidatureAction(
  candidatureId: string,
  mandateId: string,
  investigatorId: string,
): Promise<{ success: boolean; error?: string; redirectUrl?: string }> {
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
      .maybeSingle()

    if (!mandate) {
      return { success: false, error: "Mandat introuvable" }
    }

    const authCheck = await validateAgencyOwnership(supabase, user.id, mandate.agency_id)
    if (!authCheck.valid) {
      return { success: false, error: authCheck.error }
    }

    if (mandate.assigned_to && mandate.assigned_to !== investigatorId) {
      return { success: false, error: "Ce mandat est déjà assigné à un autre enquêteur" }
    }

    if (mandate.status === "completed" || mandate.status === "cancelled") {
      return { success: false, error: `Ce mandat est déjà ${mandate.status === "completed" ? "complété" : "annulé"}` }
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
      await supabase
        .from("mandate_interests")
        .update({ status: "interested", updated_at: new Date().toISOString() })
        .eq("id", candidatureId)
      return { success: false, error: "Impossible d'assigner l'enquêteur" }
    }

    try {
      await NotificationService.notifyCandidatureAccepted(investigatorId, mandateId, mandate.title)
    } catch (notifError) {
      console.error("Error sending notification (non-blocking):", notifError)
    }

    revalidateMandatePaths(mandateId, investigatorId)

    return {
      success: true,
      redirectUrl: NAVIGATION_FLOWS.afterAcceptCandidature(mandateId),
    }
  } catch (error: any) {
    console.error("Error in acceptCandidatureAction:", error)
    return { success: false, error: error.message || "Une erreur est survenue" }
  }
}

export async function rejectCandidatureAction(candidatureId: string): Promise<{ success: boolean; error?: string }> {
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
      .select(`
        mandate_id, 
        investigator_id, 
        status,
        mandates!inner(agency_id, title, assigned_to)
      `)
      .eq("id", candidatureId)
      .maybeSingle()

    if (!candidature) {
      return { success: false, error: "Candidature introuvable" }
    }

    if (candidature.mandates.assigned_to === candidature.investigator_id) {
      return { success: false, error: "Cet enquêteur est assigné au mandat. Désassignez-le d'abord." }
    }

    if (candidature.status === "rejected") {
      return { success: false, error: "Cette candidature est déjà refusée" }
    }

    const authCheck = await validateAgencyOwnership(supabase, user.id, candidature.mandates.agency_id)
    if (!authCheck.valid) {
      return { success: false, error: authCheck.error }
    }

    const { error } = await supabase
      .from("mandate_interests")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", candidatureId)

    if (error) {
      console.error("Error rejecting candidature:", error)
      return { success: false, error: "Impossible de refuser la candidature" }
    }

    try {
      await NotificationService.notifyCandidatureRejected(
        candidature.investigator_id,
        candidature.mandate_id,
        candidature.mandates.title,
      )
    } catch (notifError) {
      console.error("Error sending notification (non-blocking):", notifError)
    }

    revalidateMandatePaths(candidature.mandate_id, candidature.investigator_id)

    return { success: true }
  } catch (error: any) {
    console.error("Error in rejectCandidatureAction:", error)
    return { success: false, error: error.message || "Une erreur est survenue" }
  }
}

export async function unrejectCandidatureAction(candidatureId: string): Promise<{ success: boolean; error?: string }> {
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
      .select(`
        mandate_id, 
        investigator_id, 
        status,
        mandates!inner(agency_id, status, assigned_to)
      `)
      .eq("id", candidatureId)
      .maybeSingle()

    if (!candidature) {
      return { success: false, error: "Candidature introuvable" }
    }

    if (candidature.status !== "rejected") {
      return { success: false, error: "Cette candidature n'est pas refusée" }
    }

    if (candidature.mandates.status !== "open") {
      return { success: false, error: "Le mandat n'est plus ouvert aux candidatures" }
    }

    const authCheck = await validateAgencyOwnership(supabase, user.id, candidature.mandates.agency_id)
    if (!authCheck.valid) {
      return { success: false, error: authCheck.error }
    }

    const { error } = await supabase
      .from("mandate_interests")
      .update({ status: "interested", updated_at: new Date().toISOString() })
      .eq("id", candidatureId)

    if (error) {
      console.error("Error unrejecting candidature:", error)
      return { success: false, error: "Impossible de restaurer la candidature" }
    }

    revalidateMandatePaths(candidature.mandate_id, candidature.investigator_id)

    return { success: true }
  } catch (error: any) {
    console.error("Error in unrejectCandidatureAction:", error)
    return { success: false, error: error.message || "Une erreur est survenue" }
  }
}

export async function unassignInvestigatorAction(mandateId: string): Promise<{ success: boolean; error?: string }> {
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
      .maybeSingle()

    if (!mandate) {
      return { success: false, error: "Mandat introuvable" }
    }

    if (!mandate.assigned_to) {
      return { success: false, error: "Aucun enquêteur n'est assigné à ce mandat" }
    }

    if (mandate.status === "completed") {
      return { success: false, error: "Impossible de désassigner un enquêteur d'un mandat complété" }
    }

    const authCheck = await validateAgencyOwnership(supabase, user.id, mandate.agency_id)
    if (!authCheck.valid) {
      return { success: false, error: authCheck.error }
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

    try {
      await NotificationService.notifyInvestigatorUnassigned(previousInvestigatorId, mandateId, mandate.title)
    } catch (notifError) {
      console.error("Error sending notification (non-blocking):", notifError)
    }

    revalidateMandatePaths(mandateId, previousInvestigatorId)

    return { success: true }
  } catch (error: any) {
    console.error("Error in unassignInvestigatorAction:", error)
    return { success: false, error: error.message || "Une erreur est survenue" }
  }
}

export async function completeMandateAction(
  mandateId: string,
): Promise<{ success: boolean; error?: string; redirectUrl?: string }> {
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
      .maybeSingle()

    if (!mandate) {
      return { success: false, error: "Mandat introuvable" }
    }

    if (!mandate.assigned_to) {
      return { success: false, error: "Impossible de terminer un mandat sans enquêteur assigné" }
    }

    if (mandate.status !== "in-progress") {
      return { success: false, error: "Seuls les mandats en cours peuvent être marqués comme terminés" }
    }

    const authCheck = await validateAgencyOwnership(supabase, user.id, mandate.agency_id)
    if (!authCheck.valid) {
      return { success: false, error: authCheck.error }
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

    try {
      await NotificationService.notifyMandateCompleted(user.id, mandateId, mandate.title)
    } catch (notifError) {
      console.error("Error sending notification (non-blocking):", notifError)
    }

    revalidateMandatePaths(mandateId, mandate.assigned_to)

    return {
      success: true,
      redirectUrl: NAVIGATION_FLOWS.afterCompleteMandate(mandateId, mandate.assigned_to),
    }
  } catch (error: any) {
    console.error("Error in completeMandateAction:", error)
    return { success: false, error: error.message || "Une erreur est survenue" }
  }
}

export async function reopenMandateAction(mandateId: string): Promise<{ success: boolean; error?: string }> {
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
      .maybeSingle()

    if (!mandate) {
      return { success: false, error: "Mandat introuvable" }
    }

    if (mandate.status !== "completed") {
      return { success: false, error: "Seuls les mandats terminés peuvent être rouverts" }
    }

    const authCheck = await validateAgencyOwnership(supabase, user.id, mandate.agency_id)
    if (!authCheck.valid) {
      return { success: false, error: authCheck.error }
    }

    const newStatus = mandate.assigned_to ? "in-progress" : "open"

    const { error } = await supabase
      .from("mandates")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mandateId)

    if (error) {
      console.error("Error reopening mandate:", error)
      return { success: false, error: "Impossible de rouvrir le mandat" }
    }

    revalidateMandatePaths(mandateId, mandate.assigned_to || undefined)

    return { success: true }
  } catch (error: any) {
    console.error("Error in reopenMandateAction:", error)
    return { success: false, error: error.message || "Une erreur est survenue" }
  }
}

export async function directAssignInvestigatorAction(
  mandateId: string,
  investigatorId: string,
): Promise<{ success: boolean; error?: string }> {
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
      .maybeSingle()

    if (!mandate) {
      return { success: false, error: "Mandat introuvable" }
    }

    if (mandate.assigned_to) {
      return { success: false, error: "Ce mandat est déjà assigné à un enquêteur" }
    }

    if (mandate.status !== "open") {
      return { success: false, error: "Seuls les mandats ouverts peuvent recevoir une assignation directe" }
    }

    const authCheck = await validateAgencyOwnership(supabase, user.id, mandate.agency_id)
    if (!authCheck.valid) {
      return { success: false, error: authCheck.error }
    }

    const { error } = await supabase
      .from("mandates")
      .update({
        assigned_to: investigatorId,
        status: "in-progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", mandateId)

    if (error) {
      console.error("Error direct assigning investigator:", error)
      return { success: false, error: "Impossible d'assigner l'enquêteur" }
    }

    try {
      await NotificationService.notifyInvestigatorAssigned(investigatorId, mandateId, mandate.title)
    } catch (notifError) {
      console.error("Error sending notification (non-blocking):", notifError)
    }

    revalidateMandatePaths(mandateId, investigatorId)

    return { success: true }
  } catch (error: any) {
    console.error("Error in directAssignInvestigatorAction:", error)
    return { success: false, error: error.message || "Une erreur est survenue" }
  }
}
