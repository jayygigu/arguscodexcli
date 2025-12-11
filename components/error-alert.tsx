import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ErrorAlertProps {
  error: string | null | undefined
  title?: string
  className?: string
}

export function ErrorAlert({ error, title = "Erreur", className }: ErrorAlertProps) {
  if (!error) return null

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="font-urbanist">{title}</AlertTitle>
      <AlertDescription className="font-urbanist">{error}</AlertDescription>
    </Alert>
  )
}
