import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface AgencyAuthResult {
  user: any
  agency: any
}

/**
 * Vérifie l'authentification et retourne l'agence
 * Redirige vers login si non connecté
 * Redirige vers profil si agence non trouvée
 */
export async function getAgencyAuth(): Promise<AgencyAuthResult> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/agence/login")
  }

  const { data: agency } = await supabase.from("agencies").select("*").eq("owner_id", user.id).maybeSingle()

  if (!agency) {
    redirect("/agence/profil")
  }

  return { user, agency }
}

/**
 * Vérifie l'authentification ET que l'agence est vérifiée
 * Redirige vers profil si non vérifiée
 */
export async function getVerifiedAgencyAuth(): Promise<AgencyAuthResult> {
  const { user, agency } = await getAgencyAuth()

  if (agency.verification_status !== "verified") {
    redirect("/agence/profil")
  }

  return { user, agency }
}
