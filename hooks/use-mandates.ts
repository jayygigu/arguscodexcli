"use client"

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
  const supabase = createClient()
  const geocodeMutation = trpc.mandates.geocode.useMutation()

  const createMandate = async (input: CreateMandateInput) => {
    const { latitude, longitude, administrativeRegion } = await geocodeMutation.mutateAsync({
      postal_code: formatQuebecPostalCode(input.postal_code),
      city: input.city,
      region: input.region,
    })

    console.log("[v0] Geocoded data:", { latitude, longitude, administrativeRegion })

    const mandateData = {
      ...input,
      postal_code: formatQuebecPostalCode(input.postal_code),
      latitude,
      longitude,
      region: administrativeRegion,
      status: input.assignment_type === "direct" ? "in-progress" : "open",
    }

    const { data, error } = await supabase.from("mandates").insert(mandateData).select().single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  return {
    createMandate,
  }
}
