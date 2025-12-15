"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Building2, MapPin, Calendar, Pencil, Check, X, Camera, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"

interface Agency {
  id: string
  name: string
  description: string | null
  logo: string | null
  contact_address: string | null
  years_active: number | null
  created_at: string
}

export function AgencyProfileHeader({ agency }: { agency: Agency }) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(agency.name || "")
  const [description, setDescription] = useState(agency.description || "")
  const [logo, setLogo] = useState(agency.logo || "")
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("L'image ne doit pas dépasser 2 Mo")
      return
    }

    setIsUploadingLogo(true)

    try {
      const supabase = createBrowserSupabaseClient()

      // Create unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${agency.id}-${Date.now()}.${fileExt}`
      const filePath = `agency-logos/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage.from("public").upload(filePath, file, { upsert: true })

      if (uploadError) {
        // If storage bucket doesn't exist, use base64 fallback
        const reader = new FileReader()
        reader.onloadend = () => {
          setLogo(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("public").getPublicUrl(filePath)

        setLogo(publicUrl)
      }
    } catch (error) {
      // Fallback to base64 if storage fails
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogo(reader.result as string)
      }
      reader.readAsDataURL(file)
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createBrowserSupabaseClient()

    const { error } = await supabase
      .from("agencies")
      .update({
        name,
        description,
        logo, // Include logo in update
        updated_at: new Date().toISOString(),
      })
      .eq("id", agency.id)

    if (!error) {
      setIsEditing(false)
      router.refresh()
    }
    setIsSaving(false)
  }

  const handleCancel = () => {
    setName(agency.name || "")
    setDescription(agency.description || "")
    setLogo(agency.logo || "")
    setIsEditing(false)
  }

  const memberSince = new Date(agency.created_at).toLocaleDateString("fr-CA", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0 relative group">
          <div className="w-24 h-24 rounded-lg bg-primary/5 border border-border flex items-center justify-center overflow-hidden">
            {logo ? (
              <Image
                src={logo || "/placeholder.svg"}
                alt={agency.name}
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            ) : (
              <Building2 className="w-10 h-10 text-primary" />
            )}
          </div>

          {/* Upload overlay - visible in edit mode or on hover */}
          {isEditing && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLogo}
              className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-opacity"
            >
              {isUploadingLogo ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <>
                  <Camera className="w-6 h-6 text-white mb-1" />
                  <span className="text-xs text-white font-urbanist">Modifier</span>
                </>
              )}
            </button>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xl font-montserrat font-bold mb-2 h-auto py-1"
                  placeholder="Nom de l'agence"
                />
              ) : (
                <h1 className="text-xl font-montserrat font-bold text-foreground mb-1">{agency.name}</h1>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground font-urbanist mb-3">
                {agency.contact_address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {agency.contact_address}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Membre depuis {memberSince}
                </span>
              </div>

              {isEditing ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-sm font-urbanist resize-none"
                  placeholder="Description de votre agence..."
                  rows={2}
                />
              ) : (
                <p className="text-sm font-urbanist text-muted-foreground leading-relaxed line-clamp-2">
                  {agency.description || "Aucune description. Cliquez sur Modifier pour en ajouter une."}
                </p>
              )}
            </div>

            {/* Edit Button */}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
                    <X className="w-4 h-4 mr-1" />
                    Annuler
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                    <Check className="w-4 h-4 mr-1" />
                    {isSaving ? "..." : "Enregistrer"}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Modifier
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
