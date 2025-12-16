import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./lib/supabase"

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
  let response = NextResponse.next({ request })

  // Validate and ensure string values
  const url = String(SUPABASE_URL).trim()
  const key = String(SUPABASE_ANON_KEY).trim()

  if (!url || !key) {
    console.error("Supabase configuration invalid in proxy")
    return response
  }

  // CRITICAL: Validate URL and key format before creating client
  if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
    console.error("Invalid Supabase URL format in proxy")
    return response
  }

  if (key.length < 100) {
    console.error("Invalid Supabase ANON_KEY length in proxy")
    return response
  }

  let supabase
  try {
    supabase = createServerClient(url, key, {
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

    // CRITICAL: Validate client has auth property
    if (!supabase || !supabase.auth) {
      console.error("Supabase client invalid in proxy - missing auth")
      return response
    }
  } catch (error: any) {
    console.error("Failed to create Supabase client in proxy:", error?.message || error)
    return response
  }

  // Allow public routes and static files
  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/api/") || pathname.startsWith("/_next")) {
    return response
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Admin routes
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

    // Agency routes
    if (pathname.startsWith("/agence")) {
      if (!user) {
        return NextResponse.redirect(new URL("/agence/login", request.url))
      }

      if (pathname === "/agence/profil") {
        return response
      }

      const { data: agency } = await supabase
        .from("agencies")
        .select("verification_status")
        .eq("owner_id", user.id)
        .maybeSingle()

      if (!agency || agency.verification_status !== "verified") {
        return NextResponse.redirect(new URL("/agence/profil", request.url))
      }

      return response
    }
  } catch (error: any) {
    console.error("Error in proxy auth check:", error?.message || error)
    // Allow request to continue on error
    return response
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
