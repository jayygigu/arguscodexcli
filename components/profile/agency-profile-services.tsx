"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Pencil, Check } from "lucide-react"
import { SPECIALTIES, getSpecialtyLabel } from "@/constants/specialties"
import { useSupabaseClient } from "@/hooks/use-supabase-client"
import { useRouter } from "next/navigation"

interface Props {
  specialties: string[]
  agencyId: string
}

export function AgencyProfileServices({ specialties: initialSpecialties, agencyId }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(initialSpecialties)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const supabase = useSupabaseClient()

  const toggleSpecialty = (value: string) => {
    setSelectedSpecialties((prev) => (prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]))
  }

  const handleSave = async () => {
    setIsSaving(true)
    if (!supabase) {
      setIsSaving(false)
      return
    }

    // Delete existing specialties
    await supabase.from("agency_specialties").delete().eq("agency_id", agencyId)

    // Insert new specialties
    if (selectedSpecialties.length > 0) {
      await supabase.from("agency_specialties").insert(
        selectedSpecialties.map((specialty) => ({
          agency_id: agencyId,
          specialty,
        })),
      )
    }

    setIsEditing(false)
    router.refresh()
    setIsSaving(false)
  }

  const handleCancel = () => {
    setSelectedSpecialties(initialSpecialties)
    setIsEditing(false)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-montserrat font-semibold text-foreground">Services</h2>
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

      {isEditing ? (
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((specialty) => {
            const isSelected = selectedSpecialties.includes(specialty.value)
            return (
              <button
                key={specialty.value}
                type="button"
                onClick={() => toggleSpecialty(specialty.value)}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-urbanist transition-colors border
                  ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                  }
                `}
              >
                {specialty.label}
              </button>
            )
          })}
        </div>
      ) : (
        <div>
          {selectedSpecialties.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedSpecialties.map((specialtyValue) => (
                <Badge key={specialtyValue} variant="secondary" className="font-urbanist text-xs">
                  {getSpecialtyLabel(specialtyValue as any) || specialtyValue}
                </Badge>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-urbanist text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Ajouter des services
            </button>
          )}
        </div>
      )}
    </div>
  )
}
