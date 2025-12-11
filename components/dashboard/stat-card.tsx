import type { ReactNode } from "react"

interface StatCardProps {
  title: string
  value: number
  details?: { label: string; value: number }[]
  action?: ReactNode
}

export function StatCard({ title, value, details, action }: StatCardProps) {
  return (
    <div className="bg-white p-6 border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-gray-600 text-base font-urbanist font-semibold">{title}</h3>
      <p className="text-4xl font-montserrat font-bold text-gray-900 mt-3">{value}</p>
      {details && details.length > 0 && (
        <div className="mt-4 space-y-2">
          {details.map((detail, index) => (
            <p key={index} className="text-sm font-urbanist text-gray-600">
              {detail.label}: <span className="font-semibold text-gray-900">{detail.value}</span>
            </p>
          ))}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
