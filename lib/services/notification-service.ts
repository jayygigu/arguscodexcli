"use server"

import { createClient } from "@/lib/supabase-server"
import type { Database } from "@/types/database.types"

type NotificationType = Database["public"]["Tables"]["notifications"]["Row"]["type"]

/**
 * Crée une notification pour un utilisateur
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  mandateId?: string,
) {
  const supabase = await createClient()

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    mandate_id: mandateId,
    title,
    message,
    type,
    read: false,
  })

  if (error) {
    console.error("[NotificationService] Error creating notification:", error)
  }
}

/**
 * Notifie l'enquêteur qu'il a été assigné à un mandat
 */
export async function notifyInvestigatorAssigned(investigatorId: string, mandateId: string, mandateTitle: string) {
  await createNotification(
    investigatorId,
    "Nouveau mandat assigné",
    `Vous avez été assigné au mandat "${mandateTitle}". Consultez les détails pour commencer.`,
    "accepted",
    mandateId,
  )
}

/**
 * Notifie l'enquêteur que sa candidature a été acceptée
 */
export async function notifyCandidatureAccepted(investigatorId: string, mandateId: string, mandateTitle: string) {
  await createNotification(
    investigatorId,
    "Candidature acceptée",
    `Votre candidature pour le mandat "${mandateTitle}" a été acceptée! Vous êtes maintenant assigné à ce mandat.`,
    "accepted",
    mandateId,
  )
}

/**
 * Notifie l'enquêteur que sa candidature a été refusée
 */
export async function notifyCandidatureRejected(investigatorId: string, mandateId: string, mandateTitle: string) {
  await createNotification(
    investigatorId,
    "Candidature refusée",
    `Votre candidature pour le mandat "${mandateTitle}" n'a pas été retenue cette fois.`,
    "update",
    mandateId,
  )
}

/**
 * Notifie l'enquêteur qu'il a été désassigné d'un mandat
 */
export async function notifyInvestigatorUnassigned(investigatorId: string, mandateId: string, mandateTitle: string) {
  await createNotification(
    investigatorId,
    "Mandat réassigné",
    `Vous n'êtes plus assigné au mandat "${mandateTitle}".`,
    "update",
    mandateId,
  )
}

/**
 * Notifie l'agence qu'un mandat a été complété
 */
export async function notifyMandateCompleted(agencyId: string, mandateId: string, mandateTitle: string) {
  await createNotification(
    agencyId,
    "Mandat complété",
    `Le mandat "${mandateTitle}" a été marqué comme complété. N'oubliez pas d'évaluer l'enquêteur.`,
    "update",
    mandateId,
  )
}

/**
 * Notifie l'agence qu'une nouvelle candidature a été reçue
 */
export async function notifyNewCandidature(
  agencyOwnerId: string,
  mandateId: string,
  mandateTitle: string,
  investigatorName: string,
) {
  await createNotification(
    agencyOwnerId,
    "Nouvelle candidature",
    `${investigatorName} a postulé pour le mandat "${mandateTitle}".`,
    "new-mandate",
    mandateId,
  )
}
