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

  // Allow public routes and static files
  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/api/") || pathname.startsWith("/_next")) {
    return response
  }

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

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
