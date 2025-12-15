import type React from "react"
import { AgencyProvider } from "@/contexts/agency-context"

export default function AgenceLayout({ children }: { children: React.ReactNode }) {
  return <AgencyProvider>{children}</AgencyProvider>
}
