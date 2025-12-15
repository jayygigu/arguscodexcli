import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zsbtnlpppfjwurelpuli.supabase.co"
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

const PUBLIC_ROUTES = [
  "/",
  "/agence/login",
  "/agence/register",
  "/agence/forgot-password",
  "/agence/reset-password",
  "/admin/login",
]

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

  const pathname = request.nextUrl.pathname

  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/api/")) {
    return response
  }

  // Get user once for all checks
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
    const { data: adminUser } = await supabase.from("admin_users").select("id").eq("user_id", user.id).maybeSingle()

    if (!adminUser) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
    return response
  }

  if (pathname.startsWith("/agence")) {
    if (!user) {
      return NextResponse.redirect(new URL("/agence/login", request.url))
    }

    // Profile page is always accessible for logged-in users
    if (pathname === "/agence/profil") {
      return response
    }

    // For all other agency pages, check verification status
    const { data: agency } = await supabase
      .from("agencies")
      .select("verification_status")
      .eq("owner_id", user.id)
      .maybeSingle()

    // No agency or not verified -> profile page
    if (!agency || agency.verification_status !== "verified") {
      return NextResponse.redirect(new URL("/agence/profil", request.url))
    }

    return response
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
