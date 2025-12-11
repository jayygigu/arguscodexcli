"use client"

import { useEffect, useState } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function MessageDiagnosticPage() {
  const supabase = createBrowserSupabaseClient()
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  async function runDiagnostics() {
    setLoading(true)
    const diagnostics: any = {}

    try {
      // Test 1: Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser()
      diagnostics.auth = {
        status: user ? "success" : "error",
        message: user ? `Authentifié: ${user.email}` : "Non authentifié",
        user_id: user?.id,
      }

      if (!user) {
        setResults(diagnostics)
        setLoading(false)
        return
      }

      // Test 2: Check agency
      const { data: agency, error: agencyError } = await supabase
        .from("agencies")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle()

      diagnostics.agency = {
        status: agency ? "success" : "error",
        message: agency ? `Agence trouvée: ${agency.name}` : "Aucune agence trouvée",
        agency_id: agency?.id,
        error: agencyError?.message,
      }

      if (!agency) {
        setResults(diagnostics)
        setLoading(false)
        return
      }

      // Test 3: Check messages table access
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("agency_id", agency.id)
        .order("created_at", { ascending: false })
        .limit(10)

      diagnostics.messages = {
        status: messagesError ? "error" : "success",
        message: messagesError ? `Erreur: ${messagesError.message}` : `${messages?.length ?? 0} messages trouvés`,
        count: messages?.length ?? 0,
        error: messagesError?.message,
      }

      // Test 4: Check RLS policies
      const { data: rlsTest, error: rlsError } = await supabase.rpc("check_message_rls_policies" as any)

      diagnostics.rls = {
        status: rlsError ? "warning" : "success",
        message: rlsError
          ? "Impossible de vérifier les policies RLS (fonction non disponible)"
          : "Policies RLS vérifiées",
        note: "Exécutez le script SQL fix-messages-rls-policies.sql pour corriger les policies",
      }

      // Test 5: Check Realtime subscription
      const channel = supabase
        .channel("diagnostic-test")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `agency_id=eq.${agency.id}`,
          },
          () => {},
        )
        .subscribe((status) => {
          diagnostics.realtime = {
            status: status === "SUBSCRIBED" ? "success" : "error",
            message: `Statut: ${status}`,
          }
          setResults({ ...diagnostics })
        })

      setTimeout(() => {
        supabase.removeChannel(channel)
      }, 3000)

      // Test 6: Sample messages by type
      const agencyMessages = messages?.filter((m) => m.sender_type === "agency") ?? []
      const investigatorMessages = messages?.filter((m) => m.sender_type === "investigator") ?? []

      diagnostics.messageTypes = {
        status: "info",
        message: `Agence: ${agencyMessages.length}, Enquêteurs: ${investigatorMessages.length}`,
        agency_count: agencyMessages.length,
        investigator_count: investigatorMessages.length,
      }
    } catch (error: any) {
      diagnostics.error = {
        status: "error",
        message: `Erreur: ${error.message}`,
      }
    }

    setResults(diagnostics)
    setLoading(false)
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  function getStatusIcon(status: string) {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Diagnostic de Messagerie</h1>
            <p className="text-gray-600 mt-1">Vérification du système de messagerie</p>
          </div>
          <Link href="/agence/messages">
            <Button variant="outline">Retour aux messages</Button>
          </Link>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Résultats des tests</h2>
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? "Test en cours..." : "Relancer les tests"}
            </Button>
          </div>

          <div className="space-y-4">
            {Object.entries(results).map(([key, value]: [string, any]) => (
              <div key={key} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                {getStatusIcon(value.status)}
                <div className="flex-1">
                  <h3 className="font-medium capitalize">{key.replace(/_/g, " ")}</h3>
                  <p className="text-sm text-gray-600 mt-1">{value.message}</p>
                  {value.note && <p className="text-xs text-gray-500 mt-1 italic">{value.note}</p>}
                  {value.error && <p className="text-xs text-red-600 mt-1">Erreur: {value.error}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Instructions de dépannage</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">1. Vérifier les policies RLS</h3>
              <p className="text-gray-600 mb-2">
                Exécutez le script SQL{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">fix-messages-rls-policies.sql</code> dans Supabase SQL
                Editor.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">2. Vérifier Realtime</h3>
              <p className="text-gray-600 mb-2">
                Dans Supabase Dashboard → Database → Replication, assurez-vous que la table{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">messages</code> est cochée.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">3. Tester depuis l'app mobile</h3>
              <p className="text-gray-600 mb-2">
                Ouvrez la console de l'app mobile et cherchez les logs commençant par{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">[Messages]</code>.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">4. Vérifier la structure des messages</h3>
              <p className="text-gray-600">
                Les messages doivent avoir: <code className="bg-gray-100 px-2 py-1 rounded">agency_id</code>,{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">sender_type</code> (agency/investigator),{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">sender_id</code>,{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">content</code>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
