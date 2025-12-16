"use client"

import { useState, useCallback } from "react"
import { trpc } from "@/lib/trpc-client"
import { formatQuebecPostalCode } from "@/constants/quebec-regions"
import { debugLog } from "@/lib/debug-log"

interface CreateMandateInput {
  title: string
  type: string
  description: string
  city: string
  region: string
  postal_code: string
  date_required: string
  duration: string
  priority: string
  budget?: string
  agency_id: string
  assignment_type: "direct" | "public"
  assigned_to?: string
}

export function useMandates() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const geocodeMutation = trpc.mandates.geocode.useMutation()

  const createMandate = useCallback(
    async (input: CreateMandateInput) => {
      if (isSubmitting) {
        throw new Error("Une soumission est déjà en cours")
      }

      setIsSubmitting(true)

      try {
        debugLog('use-mandates.ts:29', 'createMandate started', {input}, 'D')

        debugLog('use-mandates.ts:38', 'Calling geocode', {postalCode:input.postal_code,city:input.city,region:input.region}, 'G')

        const { latitude, longitude, administrativeRegion } = await geocodeMutation.mutateAsync({
          postal_code: formatQuebecPostalCode(input.postal_code),
          city: input.city,
          region: input.region,
        })

        debugLog('use-mandates.ts:45', 'Geocode result', {latitude,longitude,administrativeRegion}, 'G')

        const mandateData = {
          ...input,
          postal_code: formatQuebecPostalCode(input.postal_code),
          latitude,
          longitude,
          region: administrativeRegion,
          status: input.assignment_type === "direct" ? "in-progress" : "open",
        }

        debugLog('use-mandates.ts:53', 'Inserting mandate via API', {mandateData}, 'H')

        // Use API route instead of direct Supabase call
        const response = await fetch("/api/mandates/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mandateData),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(errorData.error || "Erreur lors de la création du mandat")
        }

        const data = await response.json()

        debugLog('use-mandates.ts:57', 'Mandate insert result', {hasData:!!data,mandateId:data?.id}, 'H')

        if (!data || !data.id) {
          throw new Error("Aucune donnée retournée après la création du mandat")
        }

        return data
      } catch (err: any) {
        debugLog('use-mandates.ts:68', 'createMandate error', {error:err?.message,stack:err?.stack}, 'I')
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, geocodeMutation],
  )

  return {
    createMandate,
    isSubmitting,
  }
}
