"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import { useSupabaseClient } from "@/hooks/use-supabase-client"
import { useRouter } from "next/navigation"

interface RatingFormProps {
  mandateId: string
  investigatorId: string
  agencyId: string
  onSuccess?: () => void
}

export function RatingForm({ mandateId, investigatorId, agencyId, onSuccess }: RatingFormProps) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [onTime, setOnTime] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setError("Veuillez sélectionner une note")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (!supabase) {
        setError("Service non disponible. Veuillez réessayer plus tard.")
        setIsSubmitting(false)
        return
      }

      const { data: existingRating } = await supabase
        .from("mandate_ratings")
        .select("id")
        .eq("mandate_id", mandateId)
        .maybeSingle()

      if (existingRating) {
        setError("Vous avez déjà évalué ce mandat")
        setIsSubmitting(false)
        return
      }

      const { error: insertError } = await supabase.from("mandate_ratings").insert({
        mandate_id: mandateId,
        investigator_id: investigatorId,
        agency_id: agencyId,
        rating,
        comment: comment.trim() || null,
        on_time: onTime,
      })

      if (insertError) throw insertError

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/agence/mandats/${mandateId}`)
      }
      router.refresh()
    } catch (err: any) {
      console.error("Error submitting rating:", err)
      setError(err.message || "Erreur lors de l'envoi de l'évaluation")
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-urbanist font-medium text-gray-700 mb-2">Note globale *</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${
                  star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm font-urbanist text-gray-600 mt-2">
            {rating === 1 && "Très insatisfait"}
            {rating === 2 && "Insatisfait"}
            {rating === 3 && "Satisfait"}
            {rating === 4 && "Très satisfait"}
            {rating === 5 && "Excellent"}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-urbanist font-medium text-gray-700 mb-2">Respect des délais</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input type="radio" checked={onTime} onChange={() => setOnTime(true)} className="mr-2" />
            <span className="text-sm font-urbanist">Dans les délais</span>
          </label>
          <label className="flex items-center">
            <input type="radio" checked={!onTime} onChange={() => setOnTime(false)} className="mr-2" />
            <span className="text-sm font-urbanist">En retard</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-urbanist font-medium text-gray-700 mb-2">Commentaire (optionnel)</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Partagez votre expérience avec cet enquêteur..."
          rows={4}
          className="font-urbanist"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-urbanist text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting || rating === 0} className="flex-1">
          {isSubmitting ? "Envoi en cours..." : "Soumettre l'évaluation"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/agence/mandats/${mandateId}`)}
          disabled={isSubmitting}
        >
          Plus tard
        </Button>
      </div>
    </form>
  )
}
