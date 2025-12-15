import { FileText, CheckCircle2, Clock } from "lucide-react"

interface StatsProps {
  stats: {
    totalMandates: number
    completedMandates: number
    inProgressMandates: number
  }
}

export function AgencyProfileStats({ stats }: StatsProps) {
  const statItems = [
    {
      label: "Mandats créés",
      value: stats.totalMandates,
      icon: FileText,
    },
    {
      label: "Complétés",
      value: stats.completedMandates,
      icon: CheckCircle2,
    },
    {
      label: "En cours",
      value: stats.inProgressMandates,
      icon: Clock,
    },
  ]

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-border">
        {statItems.map((item) => (
          <div key={item.label} className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-urbanist font-medium text-muted-foreground uppercase tracking-wide">
                {item.label}
              </span>
            </div>
            <p className="text-3xl font-montserrat font-semibold text-foreground tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
