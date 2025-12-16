"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, KeyRound, Loader2 } from "lucide-react"
import { useSupabaseClient } from "@/hooks/use-supabase-client"

export function AgencyProfileSettings({ agencyId }: { agencyId: string }) {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    if (!supabase) {
      setIsLoggingOut(false)
      return
    }
    await supabase.auth.signOut()
    router.push("/agence/login")
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-sm font-montserrat font-semibold text-foreground mb-4">Compte</h2>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/agence/reset-password")}
          className="font-urbanist"
        >
          <KeyRound className="w-4 h-4 mr-2" />
          Modifier le mot de passe
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 font-urbanist"
        >
          {isLoggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
          Déconnexion
        </Button>
      </div>
    </div>
  )
}
