import type React from "react"

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Simple layout without auth check for login page
  return <>{children}</>
}
