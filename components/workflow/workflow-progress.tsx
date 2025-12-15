"use client"

import { CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkflowStep {
  id: string
  label: string
  description?: string
  status: "completed" | "current" | "upcoming"
}

interface WorkflowProgressProps {
  steps: WorkflowStep[]
  orientation?: "horizontal" | "vertical"
  size?: "sm" | "md" | "lg"
}

export function WorkflowProgress({ steps, orientation = "horizontal", size = "md" }: WorkflowProgressProps) {
  const sizeClasses = {
    sm: { icon: "h-4 w-4", text: "text-xs", padding: "p-1" },
    md: { icon: "h-5 w-5", text: "text-sm", padding: "p-1.5" },
    lg: { icon: "h-6 w-6", text: "text-base", padding: "p-2" },
  }

  const s = sizeClasses[size]

  if (orientation === "vertical") {
    return (
      <div className="space-y-0">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "rounded-full flex items-center justify-center",
                  s.padding,
                  step.status === "completed" && "bg-green-100 text-green-600",
                  step.status === "current" && "bg-primary/10 text-primary ring-2 ring-primary/30",
                  step.status === "upcoming" && "bg-muted text-muted-foreground",
                )}
              >
                {step.status === "completed" ? <CheckCircle2 className={s.icon} /> : <Circle className={s.icon} />}
              </div>
              {index < steps.length - 1 && (
                <div className={cn("w-0.5 h-8 my-1", step.status === "completed" ? "bg-green-300" : "bg-muted")} />
              )}
            </div>
            <div className="flex-1 pt-0.5 pb-4">
              <p
                className={cn(
                  "font-medium",
                  s.text,
                  step.status === "completed" && "text-green-700",
                  step.status === "current" && "text-primary font-semibold",
                  step.status === "upcoming" && "text-muted-foreground",
                )}
              >
                {step.label}
              </p>
              {step.description && <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "rounded-full flex items-center justify-center",
                s.padding,
                step.status === "completed" && "bg-green-100 text-green-600",
                step.status === "current" && "bg-primary/10 text-primary ring-2 ring-primary/30",
                step.status === "upcoming" && "bg-muted text-muted-foreground",
              )}
            >
              {step.status === "completed" ? (
                <CheckCircle2 className={s.icon} />
              ) : (
                <span className={cn(s.text, "font-semibold w-4 text-center")}>{index + 1}</span>
              )}
            </div>
            <p
              className={cn(
                "mt-1.5 text-center max-w-[80px]",
                s.text,
                step.status === "completed" && "text-green-700",
                step.status === "current" && "text-primary font-semibold",
                step.status === "upcoming" && "text-muted-foreground",
              )}
            >
              {step.label}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div className={cn("flex-1 h-0.5 mx-2", step.status === "completed" ? "bg-green-300" : "bg-muted")} />
          )}
        </div>
      ))}
    </div>
  )
}
