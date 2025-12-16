"use client"

// Force dynamic rendering - never prerender this page
export const dynamic = 'force-dynamic'
export const dynamicParams = true

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useSupabaseClient } from "@/hooks/use-supabase-client"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [hasValidSession, setHasValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()
  const supabase = useSupabaseClient()

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        setCheckingSession(false)
        return
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          setHasValidSession(true)
        } else {
          setError("Session invalide ou expirée. Veuillez demander un nouveau lien de réinitialisation.")
        }
      } catch (err) {
        setError("Erreur lors de la vérification de la session.")
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [supabase])

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères")
      setLoading(false)
      return
    }

    if (!supabase) {
      setError("Erreur de connexion")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push("/agence/dashboard")
      }, 2000)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0f4c75] mx-auto mb-4"></div>
          <p className="text-gray-600 font-urbanist">Vérification...</p>
        </div>
      </div>
    )
  }

  if (!hasValidSession && !success) {
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

          <div className="text-center mb-8">
            <h2 className="text-4xl font-montserrat font-bold text-gray-900 mb-3">Lien invalide</h2>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 w-full">
            <p className="text-sm text-red-700 font-urbanist">
              {error || "Le lien de réinitialisation est invalide ou a expiré."}
            </p>
          </div>

          <Link href="/agence/forgot-password" className="w-full">
            <button className="w-full bg-[#0f4c75] text-white font-urbanist font-semibold text-lg py-4 rounded-xl hover:bg-[#0a3552] transition-colors shadow-lg">
              Demander un nouveau lien
            </button>
          </Link>
        </div>
      </div>
    )
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
          <h2 className="text-4xl font-montserrat font-bold text-gray-900 mb-3">Nouveau mot de passe</h2>
          <p className="text-base font-urbanist text-gray-600">Choisissez un nouveau mot de passe sécurisé</p>
        </div>

        {success ? (
          <div className="w-full space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-urbanist text-green-700">
                Mot de passe mis à jour avec succès ! Redirection vers le dashboard...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="w-full space-y-6">
            <div>
              <label htmlFor="password" className="block text-base font-urbanist font-semibold text-gray-700 mb-3">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f4c75] focus:border-transparent font-urbanist text-base pr-14"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 font-urbanist mt-2">Minimum 6 caractères</p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-base font-urbanist font-semibold text-gray-700 mb-3"
              >
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f4c75] focus:border-transparent font-urbanist text-base pr-14"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
              </div>
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
              {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
