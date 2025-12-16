import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "@/components/safe-link"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  secondaryAction?: {
    label: string
    href: string
  }
}

export function EmptyState({ icon: Icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-12 text-center">
      <Icon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-montserrat font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-600 font-urbanist">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex gap-4 justify-center">
          {action && (
            <Link href={action.href}>
              <Button className="bg-[#0f4c75] hover:bg-[#0a3552] font-urbanist">{action.label}</Button>
            </Link>
          )}
          {secondaryAction && (
            <Link href={secondaryAction.href}>
              <Button variant="outline" className="font-urbanist border-gray-300 hover:bg-[#0f4c75]/5 bg-transparent">
                {secondaryAction.label}
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
