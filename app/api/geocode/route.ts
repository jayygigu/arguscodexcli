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
      headers: { Accept: "application/json" },
    })

    if (!decoupageResponse.ok) {
      return NextResponse.json(
        { error: "Impossible de déterminer la ville et la région pour ce code postal." },
        { status: 404 },
      )
    }

    const decoupageData = await decoupageResponse.json()

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
      return NextResponse.json(
        {
          error:
            "Impossible de déterminer la ville et la région pour ce code postal. Veuillez les entrer manuellement.",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      city,
      region,
      coordinates: [longitude, latitude],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erreur lors de la recherche de localisation. Veuillez réessayer." },
      { status: 500 },
    )
  }
}
