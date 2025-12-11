import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Mandate {
  id: string
  title: string
  status: string
  date_required: string
}

interface RecentMandatesListProps {
  mandates: Mandate[]
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "En attente",
    "in-progress": "En cours",
    completed: "Complété",
  }
  return labels[status] || "Inconnu"
}

function getStatusStyles(status: string): string {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    "in-progress": "bg-[#0f4c75]/10 text-[#0f4c75]",
    completed: "bg-green-100 text-green-800",
  }
  return styles[status] || "bg-gray-100 text-gray-800"
}

export function RecentMandatesList({ mandates }: RecentMandatesListProps) {
  if (!mandates || mandates.length === 0) {
    return null
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-montserrat font-semibold text-gray-900">Mandats récents</h3>
        <Link href="/agence/mandats">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-300 hover:bg-[#0f4c75]/5 bg-transparent font-urbanist"
          >
            Voir tous
          </Button>
        </Link>
      </div>
      <div className="space-y-2">
        {mandates.map((mandate) => (
          <Link key={mandate.id} href={`/agence/mandats/${mandate.id}`}>
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-urbanist font-medium text-gray-900">{mandate.title}</p>
                <p className="text-sm font-urbanist text-gray-500">
                  Date requise: {new Date(mandate.date_required).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-xs font-urbanist font-medium rounded-full ${getStatusStyles(mandate.status)}`}
              >
                {getStatusLabel(mandate.status)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
