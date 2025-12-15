"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase-browser"
import { AlertCircle, Loader2 } from "lucide-react"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    contactName: "",
    contactPhone: "",
    email: "",
    password: "",
    confirmPassword: "",
    agencyName: "",
    licenseNumber: "",
    contactAddress: "",
    city: "",
    postalCode: "",
    acceptTerms: false,
    certifyInfo: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  function validate(): string | null {
    if (!formData.contactName || formData.contactName.length < 2) return "Le nom du responsable est requis"
    if (!formData.contactPhone) return "Le téléphone est requis"
    if (!formData.email || !formData.email.includes("@")) return "Email invalide"
    if (!formData.password || formData.password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères"
    if (formData.password !== formData.confirmPassword) return "Les mots de passe ne correspondent pas"
    if (!formData.agencyName || formData.agencyName.length < 3) return "Le nom de l'agence est requis"
    if (!formData.licenseNumber) return "Le numéro de permis d'agence est requis"
    if (!formData.acceptTerms) return "Vous devez accepter les conditions d'utilisation"
    if (!formData.certifyInfo) return "Vous devez certifier l'exactitude des informations"
    return null
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError("")

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.contactName,
            phone: formData.contactPhone,
            agency_name: formData.agencyName,
            agency_license: formData.licenseNumber,
            agency_address: `${formData.contactAddress}, ${formData.city}, ${formData.postalCode}`.trim(),
            user_type: "agency_owner",
          },
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/agence/profil`,
        },
      })

      if (authError) {
        const errorMsg = authError.message?.toLowerCase() || ""
        if (errorMsg.includes("already") || errorMsg.includes("exists")) {
          setError("Un compte existe déjà avec cet email")
        } else {
          throw authError
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        throw new Error("Erreur lors de la création du compte")
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        const { data: existingAgency } = await supabase
          .from("agencies")
          .select("id")
          .eq("owner_id", authData.user.id)
          .maybeSingle()

        if (!existingAgency) {
          const { error: agencyError } = await supabase.from("agencies").insert({
            owner_id: authData.user.id,
            name: formData.agencyName,
            license_number: formData.licenseNumber,
            contact_name: formData.contactName,
            contact_email: formData.email,
            contact_phone: formData.contactPhone || "N/A",
            address: `${formData.contactAddress}, ${formData.city}, ${formData.postalCode}`.trim(),
            verification_status: "pending",
          })

          if (agencyError) {
            setError(`Erreur lors de la création de l'agence: ${agencyError.message}`)
            setLoading(false)
            return
          }
        }

        window.location.href = "/agence/profil"
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      console.error("[v0] Registration error:", err)
      setError(err.message || "Une erreur est survenue lors de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }

  if (success) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <Image src="/images/argus-logo.png" alt="Argus" width={140} height={56} className="object-contain" />
            </div>
            <h1 className="text-xl font-montserrat font-bold text-foreground mb-4">Demande d'inscription envoyée</h1>
            <p className="text-sm text-muted-foreground font-urbanist mb-2">
              Un email de confirmation a été envoyé à <strong className="text-foreground">{formData.email}</strong>
            </p>
            <p className="text-sm text-muted-foreground font-urbanist mb-6">
              Cliquez sur le lien dans l'email pour activer votre compte.
            </p>
            <Link
              href="/agence/login"
              className="inline-block px-6 py-2.5 bg-primary text-primary-foreground font-urbanist font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-4">
            <Image src="/images/argus-logo.png" alt="Argus" width={140} height={56} className="object-contain" />
          </Link>
          <h1 className="text-xl font-montserrat font-bold text-foreground">Demande d'inscription — Agence</h1>
          <p className="text-sm text-muted-foreground font-urbanist mt-1">
            Remplissez le formulaire ci-dessous pour créer votre compte agence
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="bg-card border border-border rounded-lg">
          {/* Section 1: Responsable */}
          <div className="p-6 border-b border-border">
            <h2 className="text-sm font-montserrat font-semibold text-foreground uppercase tracking-wide mb-4">
              1. Responsable du compte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-urbanist font-medium text-foreground mb-1">
                  Nom complet <span className="text-destructive">*</span>
                </label>
                <input
                  name="contactName"
                  type="text"
                  value={formData.contactName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-urbanist text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-urbanist font-medium text-foreground mb-1">
                  Téléphone <span className="text-destructive">*</span>
                </label>
                <input
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="514 123-4567"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-urbanist text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-urbanist font-medium text-foreground mb-1">
                  Courriel <span className="text-destructive">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-urbanist text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-urbanist font-medium text-foreground mb-1">
                    Mot de passe <span className="text-destructive">*</span>
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-urbanist text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Minimum 8 caractères</p>
                </div>
                <div>
                  <label className="block text-sm font-urbanist font-medium text-foreground mb-1">
                    Confirmer le mot de passe <span className="text-destructive">*</span>
                  </label>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-urbanist text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Agence */}
          <div className="p-6 border-b border-border">
            <h2 className="text-sm font-montserrat font-semibold text-foreground uppercase tracking-wide mb-4">
              2. Informations de l'agence
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-urbanist font-medium text-foreground mb-1">
                  Nom de l'agence <span className="text-destructive">*</span>
                </label>
                <input
                  name="agencyName"
                  type="text"
                  value={formData.agencyName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-urbanist text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-urbanist font-medium text-foreground mb-1">
                  No. de permis d'agence (BSP) <span className="text-destructive">*</span>
                </label>
                <input
                  name="licenseNumber"
                  type="text"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="Ex: 123456"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-urbanist text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Délivré par le Bureau de la sécurité privée</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-urbanist font-medium text-foreground mb-1">
                  Adresse du siège social
                </label>
                <input
                  name="contactAddress"
                  type="text"
                  value={formData.contactAddress}
                  onChange={handleChange}
                  placeholder="123 Rue Exemple"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-urbanist text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-urbanist font-medium text-foreground mb-1">Ville</label>
                <input
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-urbanist text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-urbanist font-medium text-foreground mb-1">Code postal</label>
                <input
                  name="postalCode"
                  type="text"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="H2X 1A1"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-urbanist text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Déclarations */}
          <div className="p-6 border-b border-border bg-muted/30">
            <h2 className="text-sm font-montserrat font-semibold text-foreground uppercase tracking-wide mb-4">
              3. Déclarations
            </h2>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="certifyInfo"
                  checked={formData.certifyInfo}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                />
                <span className="text-sm font-urbanist text-foreground">
                  Je certifie que les informations fournies sont exactes et que je dispose d'un permis d'agence de
                  sécurité privée valide délivré par le Bureau de la sécurité privée du Québec.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                />
                <span className="text-sm font-urbanist text-foreground">
                  J'accepte les{" "}
                  <Link href="/terms" className="text-primary underline">
                    conditions d'utilisation
                  </Link>{" "}
                  et la{" "}
                  <Link href="/privacy" className="text-primary underline">
                    politique de confidentialité
                  </Link>{" "}
                  d'Argus.
                </span>
              </label>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm font-urbanist text-destructive">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground font-urbanist">
              <span className="text-destructive">*</span> Champs obligatoires
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/agence/login"
                className="px-4 py-2 text-sm font-urbanist font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-urbanist font-medium text-sm rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Envoi en cours..." : "Soumettre la demande"}
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground font-urbanist mt-4">
          Vous avez déjà un compte?{" "}
          <Link href="/agence/login" className="text-primary underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
