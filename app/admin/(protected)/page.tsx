import { createClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, FileCheck, Clock } from "lucide-react"

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Fetch stats
  const [
    { count: totalAgencies },
    { count: pendingAgencies },
    { count: verifiedAgencies },
    { count: totalInvestigators },
  ] = await Promise.all([
    supabase.from("agencies").select("*", { count: "exact", head: true }),
    supabase.from("agencies").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
    supabase.from("agencies").select("*", { count: "exact", head: true }).eq("verification_status", "verified"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).not("license_number", "is", null),
  ])

  const stats = [
    {
      title: "Agences totales",
      value: totalAgencies || 0,
      icon: Building2,
      description: "Nombre total d'agences inscrites",
    },
    {
      title: "En attente",
      value: pendingAgencies || 0,
      icon: Clock,
      description: "Agences en attente de vérification",
      highlight: true,
    },
    {
      title: "Vérifiées",
      value: verifiedAgencies || 0,
      icon: FileCheck,
      description: "Agences vérifiées et actives",
    },
    {
      title: "Enquêteurs",
      value: totalInvestigators || 0,
      icon: Users,
      description: "Enquêteurs inscrits",
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-montserrat font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground font-urbanist mt-1">Vue d'ensemble de la plateforme Argus</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className={stat.highlight ? "border-primary/50 bg-primary/5" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-urbanist font-medium text-muted-foreground">{stat.title}</CardTitle>
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
        ))}
      </div>
    </div>
  )
}
