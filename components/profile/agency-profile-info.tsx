"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Check, X, Mail, Phone, MapPin, User } from "lucide-react"
import { useSupabaseClient } from "@/hooks/use-supabase-client"
import { useRouter } from "next/navigation"

interface Agency {
  id: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_address: string | null
}

export function AgencyProfileInfo({ agency }: { agency: Agency }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    contact_name: agency.contact_name || "",
    contact_email: agency.contact_email || "",
    contact_phone: agency.contact_phone || "",
    contact_address: agency.contact_address || "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const supabase = useSupabaseClient()

  const handleSave = async () => {
    setIsSaving(true)
    if (!supabase) {
      setIsSaving(false)
      return
    }

    const { error } = await supabase
      .from("agencies")
      .update({ ...formData, updated_at: new Date().toISOString() })
      .eq("id", agency.id)

    if (!error) {
      setIsEditing(false)
      router.refresh()
    }
    setIsSaving(false)
  }

  const handleCancel = () => {
    setFormData({
      contact_name: agency.contact_name || "",
      contact_email: agency.contact_email || "",
      contact_phone: agency.contact_phone || "",
      contact_address: agency.contact_address || "",
    })
    setIsEditing(false)
  }

  const contactFields = [
    { key: "contact_name", icon: User, label: "Contact", type: "text", placeholder: "Nom du contact" },
    { key: "contact_email", icon: Mail, label: "Courriel", type: "email", placeholder: "courriel@exemple.com" },
    { key: "contact_phone", icon: Phone, label: "Téléphone", type: "tel", placeholder: "(514) 000-0000" },
    { key: "contact_address", icon: MapPin, label: "Adresse", type: "text", placeholder: "Adresse complète" },
  ] as const

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-montserrat font-semibold text-foreground">Coordonnées</h2>
        {isEditing ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
              <X className="w-4 h-4 mr-1" />
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
              <Check className="w-4 h-4 mr-1" />
              {isSaving ? "..." : "Enregistrer"}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="w-4 h-4 mr-1" />
            Modifier
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {contactFields.map((field) => (
          <div key={field.key} className="flex items-center gap-3">
            <field.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {isEditing ? (
              <Input
                type={field.type}
                value={formData[field.key]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="h-9 text-sm"
              />
            ) : (
              <span className="text-sm font-urbanist text-foreground truncate">
                {formData[field.key] || <span className="text-muted-foreground">Non renseigné</span>}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
