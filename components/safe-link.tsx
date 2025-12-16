"use client"

import React from "react"
import { useRouter } from "next/navigation"

type SafeLinkProps = {
  href: string
  children: React.ReactNode
  className?: string
  prefetch?: boolean
  replace?: boolean
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
  target?: string
  rel?: string
}

/**
 * Minimal client-side link that avoids Next.js URL formatting logic.
 * Falls back to a normal anchor if router is unavailable.
 */
export function SafeLink({
  href,
  children,
  className,
  prefetch: _prefetch,
  replace = false,
  onClick,
  target,
  rel,
}: SafeLinkProps) {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e)
    if (e.defaultPrevented) return
    if (target && target !== "_self") return
    e.preventDefault()
    if (!href) return
    try {
      replace ? router.replace(href) : router.push(href)
    } catch (err) {
      // fallback to hard navigation
      window.location.href = href
    }
  }

  return (
    <a href={href || "#"} className={className} onClick={handleClick} target={target} rel={rel}>
      {children}
    </a>
  )
}

export default SafeLink
