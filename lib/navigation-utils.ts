import type { ReadonlyURLSearchParams } from "next/navigation"

export const NAVIGATION_FLOWS = {
  // After creating a mandate
  afterCreateMandate: (mandateId: string) => `/agence/mandats/${mandateId}`,

  // After accepting a candidature
  afterAcceptCandidature: (mandateId: string) => `/agence/mandats/${mandateId}`,

  // After completing a mandate
  afterCompleteMandate: (mandateId: string, investigatorId: string) =>
    `/agence/mandats/${mandateId}?action=rate&investigator=${investigatorId}`,

  // Back to list with preserved filters
  backToMandatesList: (searchParams?: ReadonlyURLSearchParams) => {
    const params = searchParams?.toString()
    return `/agence/mandats${params ? `?${params}` : ""}`
  },

  backToInvestigatorsList: (searchParams?: ReadonlyURLSearchParams) => {
    const params = searchParams?.toString()
    return `/agence/enqueteurs${params ? `?${params}` : ""}`
  },

  // Cross-section navigation
  investigatorToMessages: (investigatorId: string) => `/agence/messages/direct/${investigatorId}`,
  investigatorToCreateMandate: (investigatorId: string) => `/agence/creer-mandat?investigator=${investigatorId}`,
  mandateToInvestigator: (investigatorId: string) => `/agence/enqueteurs/${investigatorId}`,
  candidatureToMandate: (mandateId: string) => `/agence/mandats/${mandateId}`,
  candidatureToInvestigator: (investigatorId: string) => `/agence/enqueteurs/${investigatorId}`,
}

export function buildBreadcrumb(path: string, params?: Record<string, string>) {
  const segments = path.split("/").filter(Boolean)

  const breadcrumbs: Array<{ label: string; href: string }> = [{ label: "Tableau de bord", href: "/agence/dashboard" }]

  let currentPath = ""

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i]
    currentPath += `/${segment}`

    // Skip dynamic segments
    if (segment.startsWith("[")) continue

    switch (segment) {
      case "mandats":
        breadcrumbs.push({ label: "Mandats", href: "/agence/mandats" })
        break
      case "enqueteurs":
        breadcrumbs.push({ label: "Enquêteurs", href: "/agence/enqueteurs" })
        break
      case "candidatures":
        breadcrumbs.push({ label: "Candidatures", href: "/agence/candidatures" })
        break
      case "messages":
        breadcrumbs.push({ label: "Messages", href: "/agence/messages" })
        break
      case "compare":
        breadcrumbs.push({ label: "Comparer", href: "/agence/enqueteurs/compare" })
        break
      case "creer-mandat":
        breadcrumbs.push({ label: "Créer un mandat", href: "/agence/creer-mandat" })
        break
      default:
        // Dynamic segment - use params if provided
        if (params && params[segment]) {
          breadcrumbs.push({ label: params[segment], href: currentPath })
        }
    }
  }

  return breadcrumbs
}

export function persistFilters(searchParams: URLSearchParams, storage: Storage = sessionStorage) {
  const key = `filters_${window.location.pathname}`
  storage.setItem(key, searchParams.toString())
}

export function restoreFilters(storage: Storage = sessionStorage): URLSearchParams | null {
  const key = `filters_${window.location.pathname}`
  const stored = storage.getItem(key)
  return stored ? new URLSearchParams(stored) : null
}
