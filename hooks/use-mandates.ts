"use client"

import { useState, useCallback } from "react"
import { trpc } from "@/lib/trpc-client"
import { createClient } from "@/lib/supabase-browser"
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
  const supabase = createClient()
  const geocodeMutation = trpc.mandates.geocode.useMutation()

  const createMandate = useCallback(
    async (input: CreateMandateInput) => {
      if (isSubmitting) {
        throw new Error("Une soumission est déjà en cours")
      }

      setIsSubmitting(true)

      try {
        // #region agent log
        debugLog('use-mandates.ts:29', 'createMandate started', {input}, 'D')
        // #endregion

        // #region agent log
        debugLog('use-mandates.ts:38', 'Calling geocode', {postalCode:input.postal_code,city:input.city,region:input.region}, 'G')
        // #endregion

        const { latitude, longitude, administrativeRegion } = await geocodeMutation.mutateAsync({
          postal_code: formatQuebecPostalCode(input.postal_code),
          city: input.city,
          region: input.region,
        })

        // #region agent log
        debugLog('use-mandates.ts:45', 'Geocode result', {latitude,longitude,administrativeRegion}, 'G')
        // #endregion

        const mandateData = {
          ...input,
          postal_code: formatQuebecPostalCode(input.postal_code),
          latitude,
          longitude,
          region: administrativeRegion,
          status: input.assignment_type === "direct" ? "in-progress" : "open",
        }

        // #region agent log
        debugLog('use-mandates.ts:53', 'Inserting mandate', {mandateData}, 'H')
        // #endregion

        const { data, error } = await supabase.from("mandates").insert(mandateData).select().single()

        // #region agent log
        debugLog('use-mandates.ts:57', 'Mandate insert result', {hasData:!!data,error:error?.message,code:error?.code,details:error?.details}, 'H')
        // #endregion

        if (error) {
          throw new Error(error.message || "Erreur lors de la création du mandat")
        }

        if (!data) {
          throw new Error("Aucune donnée retournée après la création du mandat")
        }

        return data
      } catch (err: any) {
        // #region agent log
        debugLog('use-mandates.ts:68', 'createMandate error', {error:err?.message,stack:err?.stack}, 'I')
        // #endregion
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, geocodeMutation, supabase],
  )

  return {
    createMandate,
    isSubmitting,
  }
}
