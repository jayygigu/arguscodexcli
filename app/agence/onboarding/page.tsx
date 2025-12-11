"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase-browser"
import { CheckCircle2, Loader2 } from "lucide-react"

export default function OnboardingPage() {
  const [status, setStatus] = useState<"checking" | "initializing" | "ready" | "error">("checking")
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    initializeAccount()
  }, [])

  async function initializeAccount() {
    try {
      setCurrentStep("Vérification de votre compte...")
      setProgress(20)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/agence/login")
        return
      }

      setCurrentStep("Vérification de votre profil...")
      setProgress(40)

      // Verify profile exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError || !profile) {
        throw new Error("Profil introuvable. Veuillez contacter le support.")
      }

      setCurrentStep("Vérification de votre agence...")
      setProgress(60)

      // Verify agency exists
      const { data: agency, error: agencyError } = await supabase
        .from("agencies")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle()

      if (agencyError || !agency) {
        throw new Error("Agence introuvable. Veuillez contacter le support.")
      }

      setCurrentStep("Initialisation des données...")
      setProgress(80)

      // Initialize any missing data
      // Check if investigator_stats table exists and is accessible
      const { error: statsCheckError } = await supabase.from("investigator_stats").select("id").limit(1)

      if (!statsCheckError || statsCheckError.code === "PGRST116") {
        // Table exists and is accessible (PGRST116 = no rows, which is fine)
        console.log("[v0] Stats table is ready")
      }

      setCurrentStep("Configuration terminée!")
      setProgress(100)
      setStatus("ready")

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/agence/dashboard")
      }, 1500)
    } catch (err: any) {
      console.error("[v0] Onboarding error:", err)
      setError(err.message || "Une erreur est survenue lors de l'initialisation")
      setStatus("error")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex flex-col items-center">
            <Image src="/images/argus-logo.png" alt="Argus" width={140} height={60} className="object-contain" />
          </Link>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-montserrat font-bold text-gray-900 mb-2">
            {status === "ready" ? "Compte prêt!" : "Configuration de votre compte"}
          </h2>
          <p className="text-gray-600 font-urbanist">
            {status === "ready"
              ? "Redirection vers votre tableau de bord..."
              : "Veuillez patienter pendant que nous configurons votre espace"}
          </p>
        </div>

        {status === "error" ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-urbanist text-red-700">{error}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={initializeAccount}
                className="flex-1 bg-[#0f4c75] text-white font-urbanist font-semibold px-6 py-3 rounded-xl hover:bg-[#0a3552] transition-colors"
              >
                Réessayer
              </button>
              <Link href="/agence/login" className="flex-1">
                <button className="w-full border border-gray-300 text-gray-700 font-urbanist font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  Retour
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0f4c75] transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm font-urbanist text-gray-600 mt-3 text-center">{currentStep}</p>
            </div>

            <div className="flex flex-col space-y-3">
              <StepItem
                completed={progress >= 40}
                active={progress >= 20 && progress < 40}
                label="Profil utilisateur"
              />
              <StepItem
                completed={progress >= 60}
                active={progress >= 40 && progress < 60}
                label="Configuration agence"
              />
              <StepItem completed={progress >= 80} active={progress >= 60 && progress < 80} label="Données initiales" />
              <StepItem completed={progress === 100} active={progress >= 80 && progress < 100} label="Finalisation" />
            </div>

            {status === "ready" && (
              <div className="text-center pt-4">
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-3" />
                <p className="text-lg font-urbanist font-semibold text-green-600">Votre compte est prêt!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StepItem({ completed, active, label }: { completed: boolean; active: boolean; label: string }) {
  return (
    <div className="flex items-center space-x-3">
      {completed ? (
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
      ) : active ? (
        <Loader2 className="w-5 h-5 text-[#0f4c75] animate-spin flex-shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
      )}
      <span
        className={`font-urbanist text-sm ${completed ? "text-green-600 font-semibold" : active ? "text-[#0f4c75] font-semibold" : "text-gray-500"}`}
      >
        {label}
      </span>
    </div>
  )
}
