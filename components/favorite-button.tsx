"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface FavoriteButtonProps {
  investigatorId: string
  agencyId: string
  isFavorite: boolean
  onToggle?: (isFavorite: boolean) => void
  size?: "sm" | "md" | "lg"
  variant?: "icon" | "button"
}

export function FavoriteButton({
  investigatorId,
  agencyId,
  isFavorite: initialFavorite,
  onToggle,
  size = "md",
  variant = "icon",
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleToggle = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/investigators/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investigatorId, agencyId }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 503) {
          toast({
            title: "Fonctionnalité non disponible",
            description:
              "La fonction favoris nécessite une configuration de la base de données. Veuillez exécuter le script SQL.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Erreur",
            description: "Impossible de modifier les favoris",
            variant: "destructive",
          })
        }
        return
      }

      if (data.success) {
        setIsFavorite(data.isFavorite)
        onToggle?.(data.isFavorite)
        toast({
          title: data.isFavorite ? "Ajouté aux favoris" : "Retiré des favoris",
          description: data.isFavorite
            ? "Cet enquêteur a été ajouté à vos favoris"
            : "Cet enquêteur a été retiré de vos favoris",
        })
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (variant === "button") {
    return (
      <Button
        variant={isFavorite ? "default" : "outline"}
        size={size}
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          "rounded-xl font-urbanist",
          isFavorite ? "bg-[#0f4c75] hover:bg-[#0a3552]" : "border-gray-300 hover:bg-[#0f4c75]/5",
        )}
      >
        <Star className={cn("h-4 w-4 mr-1.5", isFavorite && "fill-current")} />
        {isFavorite ? "Favori" : "Ajouter aux favoris"}
      </Button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "p-2 rounded-lg transition-colors",
        isFavorite ? "text-yellow-500 hover:bg-yellow-50" : "text-gray-400 hover:bg-gray-100",
      )}
      title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Star className={cn("h-5 w-5", isFavorite && "fill-current")} />
    </button>
  )
}
