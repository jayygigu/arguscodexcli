import { History, Briefcase, Calendar, Star, CheckCircle, Clock } from "lucide-react"

interface CollaborationHistoryProps {
  agencyId: string
  investigatorId: string
  history: {
    total_mandates: number
    completed_mandates: number
    in_progress_mandates: number
    last_collaboration: string | null
    mandates: Array<{
      id: string
      title: string
      status: string
      created_at: string
      updated_at: string
      mandate_ratings?: Array<{
        rating: number
        comment: string | null
        on_time: boolean | null
      }>
    }>
  } | null
}

export function CollaborationHistory({ history }: CollaborationHistoryProps) {
  if (!history || history.total_mandates === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-montserrat font-semibold text-gray-900 mb-2">Aucune collaboration passée</h3>
        <p className="text-sm text-gray-600 font-urbanist">Vous n'avez pas encore collaboré avec cet enquêteur</p>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", label: "Complété" },
      "in-progress": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "En cours" },
      pending: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "En attente" },
      rejected: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Rejeté" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-urbanist font-medium ${config.bg} ${config.text} border ${config.border}`}
      >
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="h-5 w-5 text-[#0f4c75]" />
            <span className="text-sm font-urbanist font-medium text-gray-600">Total des mandats</span>
          </div>
          <div className="text-3xl font-montserrat font-bold text-gray-900">{history.total_mandates}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-urbanist font-medium text-gray-600">Complétés</span>
          </div>
          <div className="text-3xl font-montserrat font-bold text-gray-900">{history.completed_mandates}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-urbanist font-medium text-gray-600">En cours</span>
          </div>
          <div className="text-3xl font-montserrat font-bold text-gray-900">{history.in_progress_mandates}</div>
        </div>
      </div>

      {history.last_collaboration && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-urbanist">
            <Calendar className="h-4 w-4 text-blue-700" />
            <span className="text-blue-900">
              Dernière collaboration: <strong>{formatDate(history.last_collaboration)}</strong>
            </span>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-base font-montserrat font-semibold text-gray-900 mb-4">Historique des mandats</h4>
        <div className="space-y-3">
          {history.mandates.map((mandate) => (
            <div
              key={mandate.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#0f4c75] transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h5 className="text-base font-montserrat font-semibold text-gray-900 mb-1">{mandate.title}</h5>
                  <p className="text-sm font-urbanist text-gray-600">Créé le {formatDate(mandate.created_at)}</p>
                </div>
                {getStatusBadge(mandate.status)}
              </div>

              {mandate.mandate_ratings && mandate.mandate_ratings.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-urbanist font-medium text-gray-900">
                        {mandate.mandate_ratings[0].rating}/5
                      </span>
                    </div>
                    {mandate.mandate_ratings[0].on_time && (
                      <span className="text-xs font-urbanist text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                        Respecté les délais
                      </span>
                    )}
                  </div>
                  {mandate.mandate_ratings[0].comment && (
                    <p className="mt-2 text-sm font-urbanist text-gray-700 italic">
                      "{mandate.mandate_ratings[0].comment}"
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
