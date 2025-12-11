interface StatusBadgeProps {
  status: "interested" | "accepted" | "rejected" | "pending" | "active" | "completed" | "cancelled"
  label?: string
}

const statusConfig = {
  interested: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "En attente",
  },
  pending: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "En attente",
  },
  accepted: {
    bg: "bg-green-100",
    text: "text-green-800",
    label: "Acceptée",
  },
  active: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    label: "Actif",
  },
  completed: {
    bg: "bg-green-100",
    text: "text-green-800",
    label: "Terminé",
  },
  rejected: {
    bg: "bg-red-100",
    text: "text-red-800",
    label: "Refusée",
  },
  cancelled: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    label: "Annulé",
  },
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending
  const displayLabel = label || config.label

  return (
    <span className={`px-2 py-1 ${config.bg} ${config.text} rounded-full text-xs font-medium font-urbanist`}>
      {displayLabel}
    </span>
  )
}
