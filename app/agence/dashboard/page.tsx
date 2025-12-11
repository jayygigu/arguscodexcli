import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AgencyNav } from "@/components/agency-nav"
import { StatCard } from "@/components/dashboard/stat-card"
import { ActionCard } from "@/components/dashboard/action-card"
import { RecentMandatesList } from "@/components/dashboard/recent-mandates-list"
import { getDashboardData } from "@/lib/dashboard-data"

function getStatusLabel(status) {
  switch (status) {
    case "pending":
      return "En attente"
    case "in-progress":
      return "En cours"
    case "completed":
      return "Complété"
    default:
      return "Inconnu"
  }
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/agence/login")
  }

  const { data: agency } = await supabase.from("agencies").select("*").eq("owner_id", user.id).maybeSingle()

  if (!agency) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-white p-8 border border-gray-200 rounded-xl shadow-sm max-w-md">
          <h2 className="text-2xl font-montserrat font-bold mb-4 text-gray-900">Configuration en cours</h2>
          <p className="text-gray-600 font-urbanist mb-6">
            Votre agence est en cours de création. Cela peut prendre quelques instants.
          </p>
          <div className="flex gap-4">
            <Link href="/agence/onboarding" className="flex-1">
              <Button className="w-full bg-[#0f4c75] hover:bg-[#0a3552] font-urbanist">
                Continuer la configuration
              </Button>
            </Link>
            <form
              action={async () => {
                "use server"
                const supabase = await createServerSupabaseClient()
                await supabase.auth.signOut()
                redirect("/agence/login")
              }}
              className="flex-1"
            >
              <Button
                type="submit"
                variant="outline"
                className="w-full bg-transparent border-gray-300 hover:bg-[#0f4c75]/5 font-urbanist"
              >
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  let stats, recentMandates
  try {
    const dashboardData = await getDashboardData(agency.id)
    stats = dashboardData.stats
    recentMandates = dashboardData.recentMandates
  } catch (error) {
    console.error("[v0] Dashboard data error:", error)
    // Provide empty defaults for new accounts
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
  }

  return (
    <div className="min-h-screen bg-white">
      <AgencyNav />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {stats.mandatesCount === 0 && stats.completedCount === 0 && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-montserrat font-bold text-blue-900 mb-2">Bienvenue sur Argus!</h3>
            <p className="text-sm font-urbanist text-blue-700 mb-4">
              Votre compte est configuré et prêt à l'emploi. Commencez par créer votre premier mandat ou parcourez les
              enquêteurs disponibles.
            </p>
            <div className="flex gap-3">
              <Link href="/agence/creer-mandat">
                <Button className="bg-[#0f4c75] hover:bg-[#0a3552] font-urbanist">Créer un mandat</Button>
              </Link>
              <Link href="/agence/enqueteurs">
                <Button variant="outline" className="font-urbanist bg-transparent">
                  Voir les enquêteurs
                </Button>
              </Link>
            </div>
          </div>
        )}

        {stats.urgentMandatesCount > 0 && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="text-lg font-montserrat font-bold text-red-900 mb-2">
              ⚠️ {stats.urgentMandatesCount} mandat{stats.urgentMandatesCount > 1 ? "s" : ""} urgent
              {stats.urgentMandatesCount > 1 ? "s" : ""}
            </h3>
            <p className="text-sm font-urbanist text-red-700 mb-4">
              Certains mandats approchent de leur date limite. Vérifiez-les pour éviter les retards.
            </p>
            <Link href="/agence/mandats?filter=urgent">
              <Button className="bg-red-600 hover:bg-red-700 font-urbanist">Voir les mandats urgents</Button>
            </Link>
          </div>
        )}

        {stats.interestsCount > 0 && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="text-lg font-montserrat font-bold text-yellow-900 mb-2">
              {stats.interestsCount} candidature{stats.interestsCount > 1 ? "s" : ""} en attente
            </h3>
            <p className="text-sm font-urbanist text-yellow-700 mb-4">
              Des enquêteurs ont postulé à vos mandats. Consultez leurs profils et répondez rapidement.
            </p>
            <Link href="/agence/candidatures">
              <Button className="bg-yellow-600 hover:bg-yellow-700 font-urbanist">Gérer les candidatures</Button>
            </Link>
          </div>
        )}

        <div className="mb-10">
          <h2 className="text-4xl font-montserrat font-bold text-gray-900 mb-3">Tableau de bord</h2>
          <p className="text-base font-urbanist text-gray-600">Bienvenue {agency.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Mandats actifs"
            value={stats.mandatesCount}
            details={[
              { label: "Ouverts", value: stats.openCount },
              { label: "En cours", value: stats.inProgressCount },
              { label: "Urgents", value: stats.urgentMandatesCount },
            ]}
          />

          <StatCard
            title="Candidatures reçues"
            value={stats.interestsCount}
            details={[
              { label: "À traiter", value: stats.interestsCount },
              { label: "Complétés", value: stats.completedCount },
            ]}
            action={
              stats.interestsCount > 0 ? (
                <Link href="/agence/candidatures" className="block">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Voir les candidatures
                  </Button>
                </Link>
              ) : null
            }
          />

          <StatCard
            title="Enquêteurs disponibles"
            value={stats.investigatorsCount}
            details={[
              { label: "Disponibles", value: stats.investigatorsCount },
              { label: "Favoris", value: stats.favoritesCount },
            ]}
            action={
              <Link href="/agence/enqueteurs" className="block">
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Parcourir
                </Button>
              </Link>
            }
          />
        </div>

        <div className="mb-8">
          <RecentMandatesList mandates={recentMandates} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            href="/agence/mandats"
            title="Mes mandats"
            description="Gérer vos mandats publics et directs"
            buttonText="Voir les mandats"
            buttonVariant="default"
          />

          <ActionCard
            href="/agence/enqueteurs"
            title="Enquêteurs"
            description="Rechercher et sélectionner des enquêteurs"
            buttonText="Parcourir"
          />

          <ActionCard
            href="/agence/creer-mandat"
            title="Nouveau mandat"
            description="Créer un mandat public ou direct"
            buttonText="Créer"
          />

          <ActionCard
            href="/agence/candidatures"
            title="Candidatures"
            description="Gérer les candidatures reçues"
            buttonText="Voir"
          />

          <ActionCard
            href="/agence/messages"
            title="Messages"
            description="Communiquer avec les enquêteurs"
            buttonText="Ouvrir"
          />
        </div>
      </main>
    </div>
  )
}
