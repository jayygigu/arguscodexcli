import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zsbtnlpppfjwurelpuli.supabase.co"
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // IMPORTANT: Always call getUser to refresh session tokens
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes - allow without auth
  const publicRoutes = [
    "/",
    "/agence/login",
    "/agence/register",
    "/agence/forgot-password",
    "/agence/reset-password",
    "/admin/login",
  ]
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(route)),
  )

  if (isPublicRoute) {
    return response
  }

  // Protected routes - redirect to login if no user
  if (pathname.startsWith("/agence") && !user) {
    return NextResponse.redirect(new URL("/agence/login", request.url))
  }

  if (pathname.startsWith("/admin") && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
