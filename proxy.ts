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
  const pathname = request.nextUrl.pathname
  console.log("[v0] proxy() called - pathname:", pathname)
  console.log(
    "[v0] proxy() - cookies:",
    request.cookies.getAll().map((c) => c.name),
  )

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

  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/api/")) {
    console.log("[v0] proxy() - public route or API, allowing through")
    return response
  }

  // Get user once for all checks
  console.log("[v0] proxy() - getting user...")
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  console.log("[v0] proxy() - user result:", {
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
    error: userError?.message,
  })

  if (pathname.startsWith("/admin")) {
    if (!user) {
      console.log("[v0] proxy() - admin route, no user, redirecting to /admin/login")
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
    const { data: adminUser } = await supabase.from("admin_users").select("id").eq("user_id", user.id).maybeSingle()

    if (!adminUser) {
      console.log("[v0] proxy() - admin route, not an admin, redirecting to /admin/login")
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
    console.log("[v0] proxy() - admin route, user is admin, allowing through")
    return response
  }

  if (pathname.startsWith("/agence")) {
    if (!user) {
      console.log("[v0] proxy() - agence route, no user, redirecting to /agence/login")
      return NextResponse.redirect(new URL("/agence/login", request.url))
    }

    // Profile page is always accessible for logged-in users
    if (pathname === "/agence/profil") {
      console.log("[v0] proxy() - agence/profil route, allowing through")
      return response
    }

    // For all other agency pages, check verification status
    console.log("[v0] proxy() - checking agency verification...")
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("verification_status")
      .eq("owner_id", user.id)
      .maybeSingle()

    console.log("[v0] proxy() - agency result:", {
      hasAgency: !!agency,
      verificationStatus: agency?.verification_status,
      error: agencyError?.message,
    })

    // No agency or not verified -> profile page
    if (!agency || agency.verification_status !== "verified") {
      console.log("[v0] proxy() - not verified, redirecting to /agence/profil")
      return NextResponse.redirect(new URL("/agence/profil", request.url))
    }

    console.log("[v0] proxy() - verified agency, allowing through")
    return response
  }

  console.log("[v0] proxy() - unknown route, allowing through")
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
