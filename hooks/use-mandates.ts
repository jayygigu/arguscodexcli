"use client"

import { useState, useCallback } from "react"
import { trpc } from "@/lib/trpc-client"
import { createClient } from "@/lib/supabase-browser"
import { formatQuebecPostalCode } from "@/constants/quebec-regions"

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
        fetch('http://127.0.0.1:7242/ingest/25000e01-2f8f-4671-80ec-977a69923072',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-mandates.ts:29',message:'createMandate started',data:{input},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25000e01-2f8f-4671-80ec-977a69923072',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-mandates.ts:38',message:'Calling geocode',data:{postalCode:input.postal_code,city:input.city,region:input.region},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
        // #endregion

        const { latitude, longitude, administrativeRegion } = await geocodeMutation.mutateAsync({
          postal_code: formatQuebecPostalCode(input.postal_code),
          city: input.city,
          region: input.region,
        })

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25000e01-2f8f-4671-80ec-977a69923072',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-mandates.ts:45',message:'Geocode result',data:{latitude,longitude,administrativeRegion},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
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
        fetch('http://127.0.0.1:7242/ingest/25000e01-2f8f-4671-80ec-977a69923072',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-mandates.ts:53',message:'Inserting mandate',data:{mandateData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion

        const { data, error } = await supabase.from("mandates").insert(mandateData).select().single()

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25000e01-2f8f-4671-80ec-977a69923072',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-mandates.ts:57',message:'Mandate insert result',data:{hasData:!!data,error:error?.message,code:error?.code,details:error?.details},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
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
        fetch('http://127.0.0.1:7242/ingest/25000e01-2f8f-4671-80ec-977a69923072',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-mandates.ts:68',message:'createMandate error',data:{error:err?.message,stack:err?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
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
