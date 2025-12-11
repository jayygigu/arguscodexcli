"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, ArrowRight, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface ActionFeedbackProps {
  type: "success" | "info"
  title: string
  message: string
  actions: Array<{
    label: string
    href: string
    variant?: "default" | "outline"
  }>
  onDismiss?: () => void
}

export function ActionFeedback({ type, title, message, actions, onDismiss }: ActionFeedbackProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <Card
      className={`p-4 mb-6 border-l-4 ${type === "success" ? "border-green-500 bg-green-50" : "border-blue-500 bg-blue-50"}`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 ${type === "success" ? "text-green-600" : "text-blue-600"}`}>
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold font-urbanist text-gray-900 mb-1">{title}</h3>
          <p className="text-sm font-urbanist text-gray-700 mb-4">{message}</p>

          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Button size="sm" variant={action.variant || "default"} className="gap-2">
                  {action.label}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </Card>
  )
}
