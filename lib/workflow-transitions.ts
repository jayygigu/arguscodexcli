// Workflow transition types and utilities
// Separated from database.types.ts for proper export handling

export type MandateStatus = "open" | "in-progress" | "completed" | "cancelled" | "expired"

export type MandateTransition = {
  from: MandateStatus
  to: MandateStatus
  allowed: boolean
  requiresInvestigator?: boolean
}

export const MANDATE_WORKFLOW: MandateTransition[] = [
  // From open
  { from: "open", to: "in-progress", allowed: true, requiresInvestigator: true },
  { from: "open", to: "cancelled", allowed: true },
  { from: "open", to: "expired", allowed: true },
  // From in-progress
  { from: "in-progress", to: "completed", allowed: true, requiresInvestigator: true },
  { from: "in-progress", to: "open", allowed: true },
  { from: "in-progress", to: "cancelled", allowed: true },
  // From completed
  { from: "completed", to: "in-progress", allowed: true },
  { from: "completed", to: "open", allowed: true },
  // From expired
  { from: "expired", to: "open", allowed: true },
]

export function canTransition(from: MandateStatus, to: MandateStatus): boolean {
  return MANDATE_WORKFLOW.some((t) => t.from === from && t.to === to && t.allowed)
}

export function requiresInvestigator(from: MandateStatus, to: MandateStatus): boolean {
  const transition = MANDATE_WORKFLOW.find((t) => t.from === from && t.to === to)
  return transition?.requiresInvestigator ?? false
}

export function getValidNextStates(currentStatus: MandateStatus): MandateStatus[] {
  return MANDATE_WORKFLOW.filter((t) => t.from === currentStatus && t.allowed).map((t) => t.to)
}
