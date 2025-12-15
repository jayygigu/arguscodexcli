// Centralized workflow configuration
// This file defines all workflow states, transitions, and user-facing labels

export const WORKFLOW_CONFIG = {
  // Mandate statuses with user-friendly labels
  mandateStatuses: {
    open: {
      label: "Ouvert",
      description: "En attente de candidatures ou d'assignation",
      color: "blue",
      icon: "FileSearch",
    },
    "in-progress": {
      label: "En cours",
      description: "Un enquêteur travaille sur ce mandat",
      color: "purple",
      icon: "Clock",
    },
    completed: {
      label: "Complété",
      description: "Le mandat a été finalisé avec succès",
      color: "green",
      icon: "CheckCircle",
    },
    cancelled: {
      label: "Annulé",
      description: "Le mandat a été annulé",
      color: "red",
      icon: "XCircle",
    },
    expired: {
      label: "Expiré",
      description: "La date limite est dépassée",
      color: "gray",
      icon: "AlertTriangle",
    },
  },

  // Candidature statuses with user-friendly labels
  candidatureStatuses: {
    interested: {
      label: "En attente",
      description: "L'enquêteur attend votre réponse",
      color: "yellow",
      actionRequired: true,
      userAction: "Examinez le profil et acceptez ou refusez",
    },
    accepted: {
      label: "Acceptée",
      description: "Vous avez accepté cette candidature",
      color: "green",
      actionRequired: false,
      userAction: null,
    },
    rejected: {
      label: "Refusée",
      description: "Vous avez refusé cette candidature",
      color: "red",
      actionRequired: false,
      userAction: "Vous pouvez restaurer cette candidature si le mandat est encore ouvert",
    },
  },

  // Assignment types with explanations
  assignmentTypes: {
    public: {
      label: "Mandat Public",
      shortLabel: "Public",
      description: "Les enquêteurs qualifiés peuvent postuler",
      workflow: [
        "Vous créez le mandat",
        "Les enquêteurs postulent",
        "Vous examinez les candidatures",
        "Vous acceptez le meilleur profil",
        "L'enquêteur commence le travail",
      ],
      benefits: [
        "Accès à tous les enquêteurs disponibles",
        "Comparez plusieurs profils",
        "Choisissez le meilleur candidat",
      ],
    },
    direct: {
      label: "Attribution Directe",
      shortLabel: "Direct",
      description: "Vous assignez directement un enquêteur",
      workflow: [
        "Vous sélectionnez un enquêteur",
        "Vous créez le mandat",
        "L'enquêteur est immédiatement assigné",
        "Le travail peut commencer",
      ],
      benefits: ["Assignation immédiate", "Idéal pour vos enquêteurs favoris", "Pas d'attente de candidatures"],
    },
  },

  // Workflow steps for candidature process
  candidatureWorkflowSteps: [
    {
      step: 1,
      title: "Création du mandat",
      description: "Publiez votre mandat avec tous les détails nécessaires",
      status: "completed",
    },
    {
      step: 2,
      title: "Réception des candidatures",
      description: "Les enquêteurs intéressés postulent à votre mandat",
      status: "current",
    },
    {
      step: 3,
      title: "Examen des profils",
      description: "Consultez les profils, expériences et évaluations",
      status: "upcoming",
    },
    {
      step: 4,
      title: "Sélection",
      description: "Acceptez le candidat idéal pour votre mandat",
      status: "upcoming",
    },
    {
      step: 5,
      title: "Collaboration",
      description: "Travaillez avec votre enquêteur jusqu'à la complétion",
      status: "upcoming",
    },
  ],
} as const

export type MandateStatus = keyof typeof WORKFLOW_CONFIG.mandateStatuses
export type CandidatureStatus = keyof typeof WORKFLOW_CONFIG.candidatureStatuses
export type AssignmentType = keyof typeof WORKFLOW_CONFIG.assignmentTypes

export function getMandateStatusConfig(status: string) {
  return WORKFLOW_CONFIG.mandateStatuses[status as MandateStatus] || WORKFLOW_CONFIG.mandateStatuses.open
}

export function getCandidatureStatusConfig(status: string) {
  return (
    WORKFLOW_CONFIG.candidatureStatuses[status as CandidatureStatus] || WORKFLOW_CONFIG.candidatureStatuses.interested
  )
}

export function getAssignmentTypeConfig(type: string) {
  return WORKFLOW_CONFIG.assignmentTypes[type as AssignmentType] || WORKFLOW_CONFIG.assignmentTypes.public
}
