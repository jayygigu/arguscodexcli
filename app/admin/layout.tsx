import type React from "react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

export function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This root layout should NOT do any auth check
  // Auth is handled by app/admin/(protected)/layout.tsx
  return <>{children}</>
}
