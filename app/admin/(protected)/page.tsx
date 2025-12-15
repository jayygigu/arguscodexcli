import { createClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, FileCheck, Clock, UserCheck } from "lucide-react"
import Link from "next/link"

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalAgencies },
    { count: pendingAgencies },
    { count: verifiedAgencies },
    { count: totalInvestigators },
    { count: pendingInvestigators },
    { count: verifiedInvestigators },
  ] = await Promise.all([
    supabase.from("agencies").select("*", { count: "exact", head: true }),
    supabase.from("agencies").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
    supabase.from("agencies").select("*", { count: "exact", head: true }).eq("verification_status", "verified"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("user_type", "investigator"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("user_type", "investigator")
      .eq("verification_status", "pending")
      .not("license_number", "is", null),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("user_type", "investigator")
      .eq("verification_status", "verified"),
  ])

  const agencyStats = [
    {
      title: "Agences totales",
      value: totalAgencies || 0,
      icon: Building2,
      description: "Nombre total d'agences inscrites",
      href: "/admin/accounts",
    },
    {
      title: "Agences en attente",
      value: pendingAgencies || 0,
      icon: Clock,
      description: "En attente de vérification",
      highlight: (pendingAgencies || 0) > 0,
      href: "/admin/pending",
    },
    {
      title: "Agences vérifiées",
      value: verifiedAgencies || 0,
      icon: FileCheck,
      description: "Vérifiées et actives",
      href: "/admin/verified",
    },
  ]

  const investigatorStats = [
    {
      title: "Enquêteurs totaux",
      value: totalInvestigators || 0,
      icon: Users,
      description: "Nombre total d'enquêteurs",
      href: "/admin/investigators",
    },
    {
      title: "Enquêteurs en attente",
      value: pendingInvestigators || 0,
      icon: Clock,
      description: "Permis à vérifier",
      highlight: (pendingInvestigators || 0) > 0,
      href: "/admin/investigators/pending",
    },
    {
      title: "Enquêteurs vérifiés",
      value: verifiedInvestigators || 0,
      icon: UserCheck,
      description: "Permis validés",
      href: "/admin/investigators/verified",
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-montserrat font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground font-urbanist mt-1">Vue d'ensemble de la plateforme Argus</p>
      </div>

      {/* Agencies Section */}
      <div className="mb-8">
        <h2 className="text-lg font-montserrat font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Agences
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agencyStats.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card
                className={`transition-all hover:shadow-md cursor-pointer ${stat.highlight ? "border-primary/50 bg-primary/5" : ""}`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-urbanist font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`w-5 h-5 ${stat.highlight ? "text-primary" : "text-muted-foreground"}`} />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-3xl font-montserrat font-bold ${stat.highlight ? "text-primary" : "text-foreground"}`}
                  >
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground font-urbanist mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Investigators Section */}
      <div>
        <h2 className="text-lg font-montserrat font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Enquêteurs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {investigatorStats.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card
                className={`transition-all hover:shadow-md cursor-pointer ${stat.highlight ? "border-amber-500/50 bg-amber-500/5" : ""}`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-urbanist font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`w-5 h-5 ${stat.highlight ? "text-amber-500" : "text-muted-foreground"}`} />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-3xl font-montserrat font-bold ${stat.highlight ? "text-amber-600" : "text-foreground"}`}
                  >
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground font-urbanist mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
