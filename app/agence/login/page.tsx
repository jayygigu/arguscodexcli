"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase-browser"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    console.log("[v0] Login attempt started")

    try {
      const supabase = createClient()
      console.log("[v0] Supabase client created:", !!supabase)
      console.log("[v0] Supabase auth exists:", !!supabase?.auth)

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      console.log("[v0] signInWithPassword result - data:", !!data, "error:", authError?.message)

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Email ou mot de passe incorrect.")
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Veuillez confirmer votre email avant de vous connecter.")
        } else {
          setError(authError.message)
        }
        setLoading(false)
        return
      }

      console.log("[v0] Login successful, session:", !!data?.session)
      console.log("[v0] Redirecting to /agence/dashboard")
      window.location.href = "/agence/dashboard"
    } catch (err) {
      console.error("[v0] Login exception:", err)
      setError("Une erreur inattendue s'est produite")
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
          <h2 className="text-4xl font-montserrat font-bold text-gray-900 mb-3">Bienvenue</h2>
          <p className="text-base font-urbanist text-gray-600">Connectez-vous à votre compte agence</p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-6">
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

          <div>
            <label htmlFor="password" className="block text-base font-urbanist font-semibold text-gray-700 mb-3">
              Mot de passe
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
            <div className="text-right mt-3">
              <Link
                href="/agence/forgot-password"
                className="text-sm font-urbanist text-[#0f4c75] font-semibold hover:underline"
              >
                Mot de passe oublié ?
              </Link>
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
            className="w-full bg-[#0f4c75] text-white font-urbanist font-semibold text-lg py-4 rounded-xl hover:bg-[#0a3552] transition-colors shadow-lg mt-8 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-base font-urbanist text-gray-700 mt-8">
          Pas encore de compte ?{" "}
          <Link href="/agence/register" className="text-[#0f4c75] font-bold hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
