import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface AgencyAuthResult {
  user: any
  agency: any
}

/**
 * Récupère l'utilisateur et l'agence pour les pages serveur
 * Note: La vérification d'accès est déjà faite dans proxy.ts
 * Cette fonction est utilisée pour récupérer les données de l'agence
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
 * Alias pour getAgencyAuth - la vérification est maintenant centralisée dans proxy.ts
 * Gardé pour compatibilité avec le code existant
 */
export async function getVerifiedAgencyAuth(): Promise<AgencyAuthResult> {
  return getAgencyAuth()
}
