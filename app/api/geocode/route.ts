import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { postal_code } = await request.json()

    if (!postal_code) {
      return NextResponse.json({ error: "Code postal requis" }, { status: 400 })
    }

    const cleanPostalCode = postal_code.replace(/\s+/g, "").toUpperCase()

    if (!/^[GHJ]\d[A-Z]\d[A-Z]\d$/.test(cleanPostalCode)) {
      return NextResponse.json(
        { error: "Le code postal doit être valide pour le Québec (commence par G, H ou J)" },
        { status: 400 },
      )
    }

    console.log("[v0] Searching for postal code:", cleanPostalCode)

    const geocodeUrl = `https://geoegl.msp.gouv.qc.ca/apis/icherche/geocode?type=adresses&geometry=1&limit=1&q=${cleanPostalCode}`

    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        "User-Agent": "Argus-App/1.0",
        Accept: "application/json",
      },
    })

    if (!geocodeResponse.ok) {
      console.error("[v0] iCherche API error:", geocodeResponse.status)
      return NextResponse.json(
        { error: "Erreur lors de la recherche du code postal. Veuillez réessayer." },
        { status: geocodeResponse.status },
      )
    }

    const geocodeData = await geocodeResponse.json()
    console.log("[v0] iCherche response:", JSON.stringify(geocodeData, null, 2))

    if (!geocodeData.features || geocodeData.features.length === 0) {
      return NextResponse.json(
        {
          error:
            "Code postal non trouvé. Veuillez vérifier le code postal ou entrer manuellement la ville et la région.",
        },
        { status: 404 },
      )
    }

    const feature = geocodeData.features[0]

    if (!feature.geometry || !feature.geometry.coordinates) {
      return NextResponse.json(
        {
          error: "Impossible d'obtenir les coordonnées pour ce code postal.",
        },
        { status: 404 },
      )
    }

    const [longitude, latitude] = feature.geometry.coordinates
    console.log("[v0] Coordinates found:", { longitude, latitude })

    const decoupageUrl = `https://pautomatereq.diligenceinv.ca/decoupageadminqc/${longitude},${latitude}`

    const decoupageResponse = await fetch(decoupageUrl, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!decoupageResponse.ok) {
      console.error("[v0] Découpage API error:", decoupageResponse.status)
      return NextResponse.json(
        {
          error: "Impossible de déterminer la ville et la région pour ce code postal.",
        },
        { status: 404 },
      )
    }

    const decoupageData = await decoupageResponse.json()
    console.log("[v0] Découpage response:", JSON.stringify(decoupageData, null, 2))

    let city = ""
    let region = ""

    if (decoupageData.results && Array.isArray(decoupageData.results)) {
      for (const result of decoupageData.results) {
        if (result.layerName === "Municipalité") {
          city = result.value || result.attributes?.Nom || ""
        }
        if (result.layerName === "Région administrative") {
          region = result.value || result.attributes?.Nom || ""
        }
      }
    }

    if (!city || !region) {
      console.error("[v0] Could not extract city or region from découpage data")
      return NextResponse.json(
        {
          error:
            "Impossible de déterminer la ville et la région pour ce code postal. Veuillez les entrer manuellement.",
        },
        { status: 404 },
      )
    }

    console.log("[v0] Successfully geocoded:", { city, region, coordinates: [longitude, latitude] })

    return NextResponse.json({
      city,
      region,
      coordinates: [longitude, latitude],
    })
  } catch (error: any) {
    console.error("[v0] Geocoding error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la recherche de localisation. Veuillez réessayer." },
      { status: 500 },
    )
  }
}
