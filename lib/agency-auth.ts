import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface AgencyAuthResult {
  user: any
  agency: any
  supabase: any
}

/**
 * Récupère l'utilisateur et l'agence pour les pages serveur
 * Note: La vérification d'accès est déjà faite dans proxy.ts
 */
export async function getAgencyData(): Promise<AgencyAuthResult> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/agence/login")
  }

  const { data: agency } = await supabase.from("agencies").select("*").eq("owner_id", user.id).maybeSingle()

  return { user, agency, supabase }
}

export const getVerifiedAgencyAuth = getAgencyData
export const getAgencyAuth = getAgencyData
