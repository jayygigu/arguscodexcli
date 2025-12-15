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

const UNVERIFIED_ALLOWED_ROUTES = ["/agence/profil", "/api/auth/signout"]

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 1. Routes publiques - toujours accessibles
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(route + "/")),
  )
  if (isPublicRoute) {
    return response
  }

  // 2. Routes API - laisser passer (elles gèrent leur propre auth)
  if (pathname.startsWith("/api/")) {
    return response
  }

  // 3. Routes admin - vérifier si admin
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }

    // Vérifier si l'utilisateur est admin
    const { data: adminUser } = await supabase.from("admin_users").select("id").eq("user_id", user.id).maybeSingle()

    if (!adminUser && pathname !== "/admin/login") {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }

    return response
  }

  // 4. Routes agence - vérifier authentification
  if (pathname.startsWith("/agence")) {
    // Non connecté -> login
    if (!user) {
      return NextResponse.redirect(new URL("/agence/login", request.url))
    }

    // Vérifier si la route est autorisée sans vérification
    const isUnverifiedAllowed = UNVERIFIED_ALLOWED_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    )

    // Si route autorisée pour non-vérifiés, laisser passer
    if (isUnverifiedAllowed) {
      return response
    }

    // Pour toutes les autres routes, vérifier le statut de l'agence
    const { data: agency } = await supabase
      .from("agencies")
      .select("verification_status")
      .eq("owner_id", user.id)
      .maybeSingle()

    // Pas d'agence -> profil
    if (!agency) {
      return NextResponse.redirect(new URL("/agence/profil", request.url))
    }

    // Agence non vérifiée -> profil
    if (agency.verification_status !== "verified") {
      return NextResponse.redirect(new URL("/agence/profil", request.url))
    }

    // Agence vérifiée -> accès autorisé
    return response
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
