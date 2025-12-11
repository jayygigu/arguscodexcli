"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  currentLabel?: string
}

export function Breadcrumb({ items, currentLabel }: BreadcrumbProps) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-6">
      <ol className="flex items-center gap-2 text-sm">
        <li>
          <Link
            href="/agence/dashboard"
            className="flex items-center gap-1 text-gray-600 hover:text-[#0f4c75] transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="sr-only">Tableau de bord</span>
          </Link>
        </li>

        {items.map((item, index) => (
          <li key={item.href} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link href={item.href} className="text-gray-600 hover:text-[#0f4c75] transition-colors font-urbanist">
              {item.label}
            </Link>
          </li>
        ))}

        {currentLabel && (
          <li className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-semibold font-urbanist">{currentLabel}</span>
          </li>
        )}
      </ol>
    </nav>
  )
}
