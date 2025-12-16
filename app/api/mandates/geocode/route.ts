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

    const geocodeUrl = `https://geoegl.msp.gouv.qc.ca/apis/icherche/geocode?type=adresses&geometry=1&limit=1&q=${cleanPostalCode}`

    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        "User-Agent": "Argus-App/1.0",
        Accept: "application/json",
      },
    })

    if (!geocodeResponse.ok) {
      return NextResponse.json(
        { error: "Erreur lors de la recherche du code postal. Veuillez réessayer." },
        { status: geocodeResponse.status },
      )
    }

    const geocodeData = await geocodeResponse.json()

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
      return NextResponse.json({ error: "Impossible d'obtenir les coordonnées pour ce code postal." }, { status: 404 })
    }

    const [longitude, latitude] = feature.geometry.coordinates

    const decoupageUrl = `https://pautomatereq.diligenceinv.ca/decoupageadminqc/${longitude},${latitude}`

    const decoupageResponse = await fetch(decoupageUrl, {
      headers: {
        "User-Agent": "Argus-App/1.0",
        Accept: "application/json",
      },
    })

    if (!decoupageResponse.ok) {
      // If decoupage fails, return basic geocode data
      return NextResponse.json({
        city: feature.properties?.municipalite || feature.properties?.ville || "",
        region: feature.properties?.region || "",
        postal_code: cleanPostalCode,
      })
    }

    const decoupageData = await decoupageResponse.json()

    return NextResponse.json({
      city: decoupageData.municipalite || feature.properties?.municipalite || feature.properties?.ville || "",
      region: decoupageData.region || feature.properties?.region || "",
      postal_code: cleanPostalCode,
    })
  } catch (error: any) {
    console.error("Error in geocode:", error)
    return NextResponse.json({ error: error.message || "Erreur lors de la recherche" }, { status: 500 })
  }
}

