import { Award, Briefcase, Clock, TrendingUp } from "lucide-react"

interface InvestigatorStatsProps {
  stats: {
    total_mandates_completed: number
    total_mandates_in_progress: number
    average_rating: number | null
    total_ratings: number
    completion_rate: number | null
    on_time_rate: number | null
  } | null
}

export function InvestigatorStatsCard({ stats }: InvestigatorStatsProps) {
  if (!stats) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <p className="text-sm text-gray-600 font-urbanist text-center">Aucune statistique disponible</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.average_rating !== null && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4 w-4 text-[#0f4c75]" />
            <span className="text-xs font-urbanist font-medium text-gray-600">Note moyenne</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-montserrat font-bold text-gray-900">{stats.average_rating.toFixed(1)}</span>
            <span className="text-sm text-gray-600">/ 5</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 font-urbanist">{stats.total_ratings} évaluation(s)</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="h-4 w-4 text-[#0f4c75]" />
          <span className="text-xs font-urbanist font-medium text-gray-600">Mandats complétés</span>
        </div>
        <div className="text-2xl font-montserrat font-bold text-gray-900">{stats.total_mandates_completed}</div>
        {stats.total_mandates_in_progress > 0 && (
          <p className="text-xs text-gray-500 mt-1 font-urbanist">{stats.total_mandates_in_progress} en cours</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-[#0f4c75]" />
          <span className="text-xs font-urbanist font-medium text-gray-600">Taux de complétion</span>
        </div>
        <div className="text-2xl font-montserrat font-bold text-gray-900">
          {stats.completion_rate !== null ? `${stats.completion_rate.toFixed(0)}%` : "N/A"}
        </div>
        {stats.completion_rate === null && (
          <p className="text-xs text-gray-500 mt-1 font-urbanist">Pas encore de données</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-[#0f4c75]" />
          <span className="text-xs font-urbanist font-medium text-gray-600">Respect des délais</span>
        </div>
        <div className="text-2xl font-montserrat font-bold text-gray-900">
          {stats.on_time_rate !== null ? `${stats.on_time_rate.toFixed(0)}%` : "N/A"}
        </div>
        {stats.on_time_rate === null && (
          <p className="text-xs text-gray-500 mt-1 font-urbanist">Pas encore de données</p>
        )}
      </div>
    </div>
  )
}
