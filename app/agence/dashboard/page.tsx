import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import Link from "@/components/safe-link"
import { Button } from "@/components/ui/button"
import { AgencyNav } from "@/components/agency-nav"
import { getDashboardData } from "@/lib/dashboard-data"
import { PendingCandidatures } from "@/components/dashboard/pending-candidatures"
import { MandatesWithoutCandidatures } from "@/components/dashboard/mandates-without-candidatures"
import { Plus } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/agence/login")
  }

  const { data: agency } = await supabase.from("agencies").select("*").eq("owner_id", user.id).maybeSingle()

  if (!agency || agency.verification_status !== "verified") {
    redirect("/agence/profil")
  }

  let stats, recentMandates, pendingCandidatures, mandatesWithoutCandidatures
  try {
    const dashboardData = await getDashboardData(agency.id)
    stats = dashboardData.stats
    recentMandates = dashboardData.recentMandates
    pendingCandidatures = dashboardData.pendingCandidatures
    mandatesWithoutCandidatures = dashboardData.mandatesWithoutCandidatures
  } catch (error) {
    stats = {
      mandatesCount: 0,
      openCount: 0,
      inProgressCount: 0,
      completedCount: 0,
      interestsCount: 0,
      investigatorsCount: 0,
      urgentMandatesCount: 0,
      favoritesCount: 0,
      unreadMessagesCount: 0,
    }
    recentMandates = []
    pendingCandidatures = []
    mandatesWithoutCandidatures = []
  }

  const isNewUser = stats.mandatesCount === 0 && stats.completedCount === 0

  return (
    <div className="min-h-screen bg-background">
      <AgencyNav />

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-montserrat font-bold text-foreground">Bonjour, {agency.name}</h1>
            <p className="text-sm text-muted-foreground font-urbanist mt-1">
              {isNewUser
                ? "Bienvenue sur Argus. Créez votre premier mandat pour commencer."
                : `${stats.interestsCount} candidature${stats.interestsCount !== 1 ? "s" : ""} en attente de réponse`}
            </p>
          </div>
          <Link href="/agence/creer-mandat">
            <Button className="bg-primary hover:bg-primary/90 font-urbanist w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau mandat
            </Button>
          </Link>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <PendingCandidatures candidatures={pendingCandidatures || []} />
          <MandatesWithoutCandidatures mandates={mandatesWithoutCandidatures || []} />
        </div>
      </main>
    </div>
  )
}
