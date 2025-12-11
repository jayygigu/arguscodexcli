import type { Database } from "@/types/database.types"

type Mandate = Database["public"]["Tables"]["mandates"]["Row"]
type Candidature = Database["public"]["Tables"]["mandate_interests"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export class WorkflowHelper {
  /**
   * Get next recommended actions after a user completes a task
   */
  static getNextActions(context: {
    action: "created_mandate" | "accepted_candidature" | "completed_mandate" | "rejected_candidature"
    mandateId?: string
    investigatorId?: string
    mandate?: Partial<Mandate>
  }) {
    const actions = []

    switch (context.action) {
      case "created_mandate":
        if (context.mandate?.assignment_type === "direct" && context.investigatorId) {
          actions.push({
            label: "Contacter l'enquêteur",
            href: `/agence/messages/direct/${context.investigatorId}`,
            priority: "high",
          })
        }
        actions.push({
          label: "Voir le mandat créé",
          href: `/agence/mandats/${context.mandateId}`,
          priority: "high",
        })
        actions.push({
          label: "Retour à la liste",
          href: "/agence/mandats",
          priority: "low",
        })
        break

      case "accepted_candidature":
        actions.push({
          label: "Contacter l'enquêteur",
          href: `/agence/messages/direct/${context.investigatorId}`,
          priority: "high",
        })
        actions.push({
          label: "Voir le mandat",
          href: `/agence/mandats/${context.mandateId}`,
          priority: "medium",
        })
        actions.push({
          label: "Voir le profil enquêteur",
          href: `/agence/enqueteurs/${context.investigatorId}`,
          priority: "medium",
        })
        break

      case "completed_mandate":
        actions.push({
          label: "Évaluer l'enquêteur",
          href: `/agence/mandats/${context.mandateId}?action=rate`,
          priority: "high",
        })
        actions.push({
          label: "Créer un nouveau mandat",
          href: "/agence/creer-mandat",
          priority: "medium",
        })
        break

      case "rejected_candidature":
        actions.push({
          label: "Voir d'autres candidatures",
          href: "/agence/candidatures",
          priority: "medium",
        })
        actions.push({
          label: "Voir le mandat",
          href: `/agence/mandats/${context.mandateId}`,
          priority: "medium",
        })
        break
    }

    return actions
  }

  /**
   * Get contextual information to display in a page
   */
  static getPageContext(params: {
    page: "message" | "candidature" | "mandate"
    investigatorId?: string
    mandateId?: string
    investigator?: Partial<Profile>
    mandate?: Partial<Mandate>
  }) {
    const context: any = {
      relatedLinks: [],
      quickActions: [],
      alerts: [],
    }

    if (params.page === "message" && params.investigatorId) {
      context.relatedLinks.push({
        label: "Voir le profil",
        href: `/agence/enqueteurs/${params.investigatorId}`,
        icon: "user",
      })

      if (params.mandateId) {
        context.relatedLinks.push({
          label: "Voir le mandat",
          href: `/agence/mandats/${params.mandateId}`,
          icon: "briefcase",
        })
      }
    }

    if (params.page === "candidature") {
      if (params.investigatorId) {
        context.quickActions.push({
          label: "Voir le profil",
          href: `/agence/enqueteurs/${params.investigatorId}`,
        })
        context.quickActions.push({
          label: "Envoyer un message",
          href: `/agence/messages/direct/${params.investigatorId}`,
        })
      }

      if (params.mandateId) {
        context.quickActions.push({
          label: "Voir le mandat",
          href: `/agence/mandats/${params.mandateId}`,
        })
      }
    }

    if (params.page === "mandate" && params.mandate) {
      if (params.mandate.assigned_to) {
        context.quickActions.push({
          label: "Contacter l'enquêteur",
          href: `/agence/messages/direct/${params.mandate.assigned_to}`,
        })
        context.quickActions.push({
          label: "Voir le profil enquêteur",
          href: `/agence/enqueteurs/${params.mandate.assigned_to}`,
        })
      }

      if (params.mandate.status === "open") {
        context.alerts.push({
          type: "info",
          message: "Ce mandat est ouvert. Les enquêteurs peuvent postuler.",
        })
      }

      // Check if deadline is approaching
      if (params.mandate.date_required) {
        const daysUntilDeadline = Math.ceil(
          (new Date(params.mandate.date_required).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        )
        if (daysUntilDeadline <= 3 && daysUntilDeadline > 0) {
          context.alerts.push({
            type: "warning",
            message: `Date limite dans ${daysUntilDeadline} jour${daysUntilDeadline > 1 ? "s" : ""}`,
          })
        }
      }
    }

    return context
  }
}
