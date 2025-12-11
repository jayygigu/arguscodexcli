"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase-browser"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    agencyName: "",
    contactName: "",
    contactPhone: "",
    contactAddress: "",
    description: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères")
      setLoading(false)
      return
    }

    if (!formData.email.includes("@")) {
      setError("Email invalide")
      setLoading(false)
      return
    }

    if (!formData.agencyName || formData.agencyName.length < 3) {
      setError("Le nom de l'agence doit contenir au moins 3 caractères")
      setLoading(false)
      return
    }

    if (!formData.contactName || formData.contactName.length < 2) {
      setError("Le nom du contact est requis")
      setLoading(false)
      return
    }

    try {
      console.log("[v0] Starting agency registration process...")

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.contactName,
            phone: formData.contactPhone,
            agency_name: formData.agencyName,
            agency_address: formData.contactAddress,
            agency_description: formData.description,
            user_type: "agency_owner", // Explicit user type
          },
          emailRedirectTo: `${window.location.origin}/agence/onboarding`,
        },
      })

      if (authError) {
        console.log("[v0] Auth error:", authError)
        const errorMsg = authError.message?.toLowerCase() || ""

        if (errorMsg.includes("already") || errorMsg.includes("exists")) {
          const { data: profiles } = await supabase.from("profiles").select("id").eq("email", formData.email).single()

          const { data: agencies } = await supabase
            .from("agencies")
            .select("id")
            .eq("contact_email", formData.email)
            .single()

          if (profiles && agencies) {
            setError("account_exists")
          } else {
            setError("orphaned_account")
          }
          setLoading(false)
          return
        }

        throw authError
      }

      if (!authData.user) {
        throw new Error("Erreur lors de la création du compte")
      }

      console.log("[v0] User created successfully:", authData.user.id)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        console.log("[v0] Session established, verifying profile and agency...")

        // Wait for trigger to complete (with retries)
        let retries = 0
        const maxRetries = 10
        let profileCreated = false
        let agencyCreated = false

        while (retries < maxRetries && (!profileCreated || !agencyCreated)) {
          await new Promise((resolve) => setTimeout(resolve, 500)) // Wait 500ms between retries

          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", authData.user.id)
            .maybeSingle()

          const { data: agency } = await supabase
            .from("agencies")
            .select("id")
            .eq("owner_id", authData.user.id)
            .maybeSingle()

          profileCreated = !!profile
          agencyCreated = !!agency

          console.log(`[v0] Retry ${retries + 1}: Profile=${profileCreated}, Agency=${agencyCreated}`)

          if (profileCreated && agencyCreated) {
            console.log("[v0] Profile and agency verified successfully")

            const { error: statsError } = await supabase.from("investigator_stats").insert([]).select().limit(0) // Just to check if table exists

            if (statsError && statsError.code !== "PGRST116") {
              console.log("[v0] Stats table check:", statsError.message)
            }

            // Redirect to onboarding page
            window.location.href = "/agence/onboarding"
            return
          }

          retries++
        }

        if (!profileCreated || !agencyCreated) {
          throw new Error(
            `Erreur lors de la création du compte: ${!profileCreated ? "profil manquant" : ""} ${!agencyCreated ? "agence manquante" : ""}`,
          )
        }
      } else {
        // No session means email confirmation required
        setSuccess(true)
      }
    } catch (err: any) {
      console.log("[v0] Registration error:", err)
      setError(err.message || "Une erreur est survenue lors de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4">
      <div className="max-w-2xl w-full space-y-8 p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex flex-col items-center">
            <Image
              src="/images/argus-logo.png"
              alt="Argus"
              width={140}
              height={60}
              className="object-contain hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>

        <div>
          <h2 className="text-3xl font-montserrat font-bold text-center text-gray-900">Créer un compte Agence</h2>
          <p className="mt-2 text-center text-gray-600 font-urbanist">Argus - Plateforme Agences</p>
        </div>

        {success ? (
          <div className="text-center space-y-4 py-8">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h3 className="text-2xl font-montserrat font-bold text-green-600">Compte créé avec succès !</h3>
            <p className="text-gray-600 font-urbanist">
              Un email de confirmation a été envoyé à <strong>{formData.email}</strong>
            </p>
            <p className="text-sm text-gray-500 font-urbanist">
              Cliquez sur le lien dans l'email pour activer votre compte.
            </p>
            <div className="mt-6 p-4 bg-blue-50 rounded-xl text-left border border-blue-100">
              <p className="text-sm font-urbanist font-semibold text-blue-900 mb-2">💡 Pour tester sans email :</p>
              <ol className="text-xs font-urbanist text-blue-700 space-y-1 list-decimal list-inside">
                <li>Allez dans Supabase Dashboard → Authentication → Settings</li>
                <li>Désactivez "Enable email confirmations"</li>
                <li>Réessayez l'inscription</li>
              </ol>
            </div>
            <Link href="/agence/login">
              <button className="mt-6 bg-[#0f4c75] text-white font-urbanist font-semibold text-base px-8 py-3 rounded-xl hover:bg-[#0a3552] transition-colors shadow-lg">
                Retour à la connexion
              </button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-urbanist font-semibold text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="contact@agence.fr"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f4c75] focus:border-transparent font-urbanist text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contactPhone"
                    className="block text-sm font-urbanist font-semibold text-gray-700 mb-2"
                  >
                    Téléphone *
                  </label>
                  <input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    required
                    placeholder="06 12 34 56 78"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f4c75] focus:border-transparent font-urbanist text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-urbanist font-semibold text-gray-700 mb-2">
                    Mot de passe *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f4c75] focus:border-transparent font-urbanist text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-urbanist font-semibold text-gray-700 mb-2"
                  >
                    Confirmer mot de passe *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f4c75] focus:border-transparent font-urbanist text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-lg font-montserrat font-semibold mb-4 text-gray-900">Informations de l'agence</h3>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="agencyName"
                      className="block text-sm font-urbanist font-semibold text-gray-700 mb-2"
                    >
                      Nom de l'agence *
                    </label>
                    <input
                      id="agencyName"
                      name="agencyName"
                      type="text"
                      value={formData.agencyName}
                      onChange={handleChange}
                      required
                      placeholder="Agence Détective Privé"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f4c75] focus:border-transparent font-urbanist text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contactName"
                      className="block text-sm font-urbanist font-semibold text-gray-700 mb-2"
                    >
                      Nom du contact *
                    </label>
                    <input
                      id="contactName"
                      name="contactName"
                      type="text"
                      value={formData.contactName}
                      onChange={handleChange}
                      required
                      placeholder="Jean Dupont"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f4c75] focus:border-transparent font-urbanist text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contactAddress"
                      className="block text-sm font-urbanist font-semibold text-gray-700 mb-2"
                    >
                      Adresse
                    </label>
                    <input
                      id="contactAddress"
                      name="contactAddress"
                      type="text"
                      value={formData.contactAddress}
                      onChange={handleChange}
                      placeholder="123 Rue de la République, 75001 Paris"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f4c75] focus:border-transparent font-urbanist text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-urbanist font-semibold text-gray-700 mb-2"
                    >
                      Description de l'agence
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Décrivez votre agence, vos spécialités..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f4c75] focus:border-transparent font-urbanist text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                {error === "account_exists" ? (
                  <div className="space-y-3">
                    <p className="font-urbanist font-semibold text-red-800">✋ Ce compte existe déjà</p>
                    <p className="text-sm font-urbanist text-red-700">
                      Un compte complet existe avec cet email. Utilisez la connexion.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Link href="/agence/login">
                        <button className="px-4 py-2 text-sm font-urbanist font-semibold text-[#0f4c75] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          Se connecter
                        </button>
                      </Link>
                      <Link href="/agence/forgot-password">
                        <button className="px-4 py-2 text-sm font-urbanist font-semibold text-[#0f4c75] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          Mot de passe oublié ?
                        </button>
                      </Link>
                    </div>
                  </div>
                ) : error === "orphaned_account" ? (
                  <div className="space-y-3">
                    <p className="font-urbanist font-semibold text-red-800">⚠️ Compte incomplet détecté</p>
                    <p className="text-sm font-urbanist text-red-700">
                      Un compte existe avec cet email mais le profil est incomplet.
                    </p>
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs font-urbanist text-yellow-800">
                      <p className="font-semibold mb-2">Solution :</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Allez dans Supabase Dashboard → Authentication → Users</li>
                        <li>
                          Trouvez l'utilisateur avec l'email : <strong>{formData.email}</strong>
                        </li>
                        <li>Supprimez cet utilisateur</li>
                        <li>Réessayez l'inscription</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-urbanist text-red-700">{error}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#0f4c75] text-white font-urbanist font-semibold text-lg py-4 rounded-xl hover:bg-[#0a3552] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Création en cours..." : "Créer mon compte"}
            </button>

            <div className="text-center">
              <Link href="/agence/login" className="text-sm font-urbanist text-[#0f4c75] font-semibold hover:underline">
                Déjà un compte ? Se connecter
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
