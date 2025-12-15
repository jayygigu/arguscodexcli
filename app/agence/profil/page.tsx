import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { AgencyNav } from "@/components/agency-nav"
import { Breadcrumb } from "@/components/breadcrumb"
import { AgencyProfileHeader } from "@/components/profile/agency-profile-header"
import { AgencyProfileInfo } from "@/components/profile/agency-profile-info"
import { AgencyProfileStats } from "@/components/profile/agency-profile-stats"
import { AgencyProfileServices } from "@/components/profile/agency-profile-services"
import { AgencyProfileSettings } from "@/components/profile/agency-profile-settings"
import { AlertCircle, Clock, CheckCircle2, XCircle, Shield } from "lucide-react"

export default async function AgencyProfilePage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/agence/login")
  }

  const { data: agency } = await supabase.from("agencies").select("*").eq("owner_id", user.id).maybeSingle()

  if (!agency) {
    const metadata = user.user_metadata

    if (metadata?.agency_name && metadata?.user_type === "agency_owner") {
      const { error: createError } = await supabase.from("agencies").insert({
        owner_id: user.id,
        name: metadata.agency_name,
        license_number: metadata.agency_license || "",
        contact_name: metadata.name || "",
        contact_email: user.email || "",
        contact_phone: metadata.phone || "",
        address: metadata.agency_address || "",
        verification_status: "pending",
      })

      if (!createError) {
        redirect("/agence/profil")
      }
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h2 className="text-xl font-montserrat font-bold text-foreground mb-2">Compte non trouvé</h2>
          <p className="text-sm text-muted-foreground font-urbanist mb-6">
            Aucune agence n'est associée à ce compte. Veuillez vous inscrire ou contacter le support.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/agence/register"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-urbanist font-medium hover:bg-primary/90 transition-colors"
            >
              Créer une agence
            </Link>
            <Link
              href="/api/auth/signout?redirect=/agence/login"
              className="px-4 py-2 text-muted-foreground hover:text-foreground font-urbanist transition-colors"
            >
              Se déconnecter
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { data: specialtiesData } = await supabase
    .from("agency_specialties")
    .select("specialty")
    .eq("agency_id", agency.id)

  // Fetch agency statistics only if verified
  let stats = {
    totalMandates: 0,
    completedMandates: 0,
    inProgressMandates: 0,
  }

  if (agency.verification_status === "verified") {
    const [{ count: totalMandates }, { count: completedMandates }, { count: inProgressMandates }] = await Promise.all([
      supabase.from("mandates").select("*", { count: "exact", head: true }).eq("agency_id", agency.id),
      supabase
        .from("mandates")
        .select("*", { count: "exact", head: true })
        .eq("agency_id", agency.id)
        .eq("status", "completed"),
      supabase
        .from("mandates")
        .select("*", { count: "exact", head: true })
        .eq("agency_id", agency.id)
        .eq("status", "in-progress"),
    ])

    stats = {
      totalMandates: totalMandates || 0,
      completedMandates: completedMandates || 0,
      inProgressMandates: inProgressMandates || 0,
    }
  }

  const specialties = specialtiesData?.map((s) => s.specialty) || []
  const isPending = agency.verification_status === "pending"
  const isRejected = agency.verification_status === "rejected"
  const isSuspended = agency.verification_status === "suspended"

  return (
    <div className="min-h-screen bg-background">
      <AgencyNav />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Bandeau de statut de vérification */}
        {isPending && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-montserrat font-semibold text-foreground">Vérification en cours</h3>
                <p className="text-sm text-muted-foreground font-urbanist mt-1">
                  Votre compte est en attente de validation par notre équipe. Pendant ce temps, vous pouvez compléter
                  votre profil d'agence ci-dessous (photo, spécialités, informations).
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Vérification du permis BSP</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Validation de l'identité</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-montserrat font-semibold text-destructive">Inscription refusée</h3>
                <p className="text-sm text-muted-foreground font-urbanist mt-1">
                  Votre demande n'a pas été approuvée. Veuillez contacter le support pour plus d'informations.
                </p>
                {agency.rejection_reason && (
                  <p className="text-sm text-foreground font-urbanist mt-2 p-2 bg-muted/50 rounded">
                    <strong>Raison:</strong> {agency.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {isSuspended && (
          <div className="mb-6 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-montserrat font-semibold text-orange-600">Compte suspendu</h3>
                <p className="text-sm text-muted-foreground font-urbanist mt-1">
                  Votre compte a été temporairement suspendu. Veuillez contacter le support.
                </p>
              </div>
            </div>
          </div>
        )}

        <Breadcrumb
          items={
            agency.verification_status === "verified" ? [{ label: "Tableau de bord", href: "/agence/dashboard" }] : []
          }
          currentLabel="Profil de l'agence"
        />

        <div className="mt-6 space-y-4">
          {/* Header with logo upload */}
          <AgencyProfileHeader agency={agency} />

          {/* Stats - only show if verified */}
          {agency.verification_status === "verified" && <AgencyProfileStats stats={stats} />}

          {/* Two column grid for info and services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AgencyProfileInfo agency={agency} />
            <AgencyProfileServices specialties={specialties} agencyId={agency.id} />
          </div>

          {/* Settings at bottom */}
          <AgencyProfileSettings agencyId={agency.id} />
        </div>
      </main>
    </div>
  )
}
