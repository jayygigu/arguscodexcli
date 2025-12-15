import { z } from "zod"
import { router, publicProcedure } from "@/lib/trpc"
import {
  retryWithBackoff,
  fetchWithTimeout,
  isInQuebec,
  extractCityFromAddress,
  inferRegionFromCity,
} from "@/lib/geocoding-utils"

async function geocodePostalCode(postalCode: string, city: string, region: string) {
  try {
    const cleanPostalCode = postalCode.replace(/\s+/g, "").toUpperCase()

    if (!/^[GHJ]\d[A-Z]\d[A-Z]\d$/.test(cleanPostalCode)) {
      throw new Error("Code postal invalide. Doit commencer par G, H ou J et suivre le format A1A1A1")
    }

    const geocodeUrl = `https://geoegl.msp.gouv.qc.ca/apis/icherche/geocode?type=adresses&geometry=1&limit=1&q=${cleanPostalCode}`

    const geocodeData = await retryWithBackoff(async () => {
      const response = await fetchWithTimeout(
        geocodeUrl,
        {
          headers: {
            "User-Agent": "Argus-App/1.0",
            Accept: "application/json",
          },
        },
        10000,
      )

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`)
      }

      const data = await response.json()

      if (!data.features || data.features.length === 0) {
        throw new Error("Aucun résultat trouvé pour ce code postal")
      }

      return data
    }, 3)

    const feature = geocodeData.features[0]
    const coordinates = feature.geometry.coordinates
    const longitude = coordinates[0]
    const latitude = coordinates[1]

    if (!isInQuebec(latitude, longitude)) {
      throw new Error("Les coordonnées ne sont pas au Québec. Veuillez vérifier le code postal.")
    }

    const addressName = feature.properties.nom || ""
    const cityFromAddress = extractCityFromAddress(addressName) || city

    let administrativeRegion = region

    try {
      const adminData = await retryWithBackoff(async () => {
        const adminUrl = `https://automatereq.diligenceinv.ca/decoupageadminqc/${longitude},${latitude}`
        const response = await fetchWithTimeout(
          adminUrl,
          {
            headers: {
              "User-Agent": "Argus-App/1.0",
              Accept: "application/json",
            },
          },
          8000,
        )

        if (!response.ok) {
          throw new Error(`Admin API returned status ${response.status}`)
        }

        const contentType = response.headers.get("content-type")
        if (!contentType?.includes("application/json")) {
          throw new Error("Admin API returned non-JSON response")
        }

        return await response.json()
      }, 2)

      const possibleRegionFields = [
        "region",
        "nom_region",
        "regionAdministrative",
        "nomRegion",
        "ra",
        "RA",
        "res_name_fr",
        "name",
      ]

      for (const field of possibleRegionFields) {
        if (adminData[field]) {
          administrativeRegion = adminData[field]
          break
        }
      }
    } catch {
      // Silent fail - will try to infer from city
    }

    if (!administrativeRegion || administrativeRegion === region) {
      const inferredRegion = inferRegionFromCity(cityFromAddress)
      if (inferredRegion) {
        administrativeRegion = inferredRegion
      }
    }

    return {
      latitude,
      longitude,
      city: cityFromAddress,
      administrativeRegion,
      success: true,
      message:
        administrativeRegion && administrativeRegion !== region
          ? "Géocodage réussi"
          : "Ville trouvée, mais la région n'a pas pu être déterminée automatiquement",
    }
  } catch (error: any) {
    let errorMessage = "Impossible de géocoder le code postal."

    if (error.message.includes("invalide")) {
      errorMessage = error.message
    } else if (error.message.includes("Aucun résultat")) {
      errorMessage = `Le code postal ${postalCode} n'a pas été trouvé. Veuillez vérifier qu'il est valide pour le Québec.`
    } else if (error.message.includes("timeout")) {
      errorMessage = "Le service de géocodage ne répond pas. Veuillez réessayer dans quelques instants."
    } else if (error.message.includes("Québec")) {
      errorMessage = error.message
    } else {
      errorMessage = `Erreur lors du géocodage: ${error.message}. Veuillez réessayer.`
    }

    throw new Error(errorMessage)
  }
}

export const mandatesRouter = router({
  geocode: publicProcedure
    .input(
      z.object({
        postal_code: z.string(),
        city: z.string().optional(),
        region: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await geocodePostalCode(input.postal_code, input.city || "", input.region || "")

      return {
        latitude: result.latitude,
        longitude: result.longitude,
        city: result.city,
        administrativeRegion: result.administrativeRegion,
        message: result.message,
      }
    }),
})
