"use client"

// Force dynamic rendering - never prerender this page
export const dynamic = 'force-dynamic'
export const dynamicParams = true

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSupabaseClient } from "@/hooks/use-supabase-client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const supabase = useSupabaseClient()

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    
    if (!supabase) {
      setError("Service non disponible. Veuillez réessayer plus tard.")
      return
    }
    
    setLoading(true)
    setError("")
    setSuccess(false)

    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/agence/reset-password`
        : `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000"}/agence/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-[500px] flex flex-col items-center">
        <Link href="/" className="mb-10 flex flex-col items-center">
          <Image
            src="/images/argus-logo.png"
            alt="Argus"
            width={180}
            height={180}
            className="object-contain hover:opacity-80 transition-opacity"
          />
        </Link>

        <div className="text-center mb-12">
          <h2 className="text-4xl font-montserrat font-bold text-gray-900 mb-3">Mot de passe oublié</h2>
          <p className="text-base font-urbanist text-gray-600">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        {success ? (
          <div className="w-full space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-urbanist text-green-700">
                Un email de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception
                et vos spams.
              </p>
            </div>
            <Link href="/agence/login">
              <button className="w-full bg-[#0f4c75] text-white font-urbanist font-semibold text-lg py-4 rounded-xl hover:bg-[#0a3552] transition-colors shadow-lg">
                Retour à la connexion
              </button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="w-full space-y-6">
            <div>
              <label htmlFor="email" className="block text-base font-urbanist font-semibold text-gray-700 mb-3">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@agence.com"
                className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f4c75] focus:border-transparent font-urbanist text-base text-gray-900 placeholder:text-gray-500"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700 font-urbanist">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f4c75] text-white font-urbanist font-semibold text-lg py-4 rounded-xl hover:bg-[#0a3552] transition-colors shadow-lg mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Envoi en cours..." : "Envoyer le lien"}
            </button>

            <div className="text-center">
              <Link href="/agence/login" className="text-sm font-urbanist text-[#0f4c75] font-semibold hover:underline">
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
