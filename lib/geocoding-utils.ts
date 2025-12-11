/**
 * Comprehensive mapping of Quebec cities to their administrative regions
 * Covers all 17 administrative regions of Quebec
 */
export const QUEBEC_CITY_TO_REGION: Record<string, string> = {
  // Bas-Saint-Laurent (01)
  Rimouski: "Bas-Saint-Laurent",
  Rivière: "Bas-Saint-Laurent",
  Matane: "Bas-Saint-Laurent",
  "La Pocatière": "Bas-Saint-Laurent",
  Amqui: "Bas-Saint-Laurent",
  "Mont-Joli": "Bas-Saint-Laurent",

  // Saguenay–Lac-Saint-Jean (02)
  Saguenay: "Saguenay-Lac-Saint-Jean",
  Alma: "Saguenay-Lac-Saint-Jean",
  Dolbeau: "Saguenay-Lac-Saint-Jean",
  "Dolbeau-Mistassini": "Saguenay-Lac-Saint-Jean",
  Roberval: "Saguenay-Lac-Saint-Jean",
  "Saint-Félicien": "Saguenay-Lac-Saint-Jean",
  Chicoutimi: "Saguenay-Lac-Saint-Jean",
  Jonquière: "Saguenay-Lac-Saint-Jean",

  // Capitale-Nationale (03)
  Québec: "Capitale-Nationale",
  "Sainte-Foy": "Capitale-Nationale",
  Beauport: "Capitale-Nationale",
  Charlesbourg: "Capitale-Nationale",
  "La Malbaie": "Capitale-Nationale",
  Baie: "Capitale-Nationale",
  "Baie-Saint-Paul": "Capitale-Nationale",

  // Mauricie (04)
  "Trois-Rivières": "Mauricie",
  Shawinigan: "Mauricie",
  "La Tuque": "Mauricie",
  Louiseville: "Mauricie",

  // Estrie (05)
  Sherbrooke: "Estrie",
  Magog: "Estrie",
  Granby: "Estrie",
  Cowansville: "Estrie",
  Asbestos: "Estrie",
  "Lac-Mégantic": "Estrie",

  // Montréal (06)
  Montréal: "Montréal",
  "Montréal-Nord": "Montréal",
  "Montréal-Est": "Montréal",
  Westmount: "Montréal",
  "Mont-Royal": "Montréal",
  Outremont: "Montréal",
  Verdun: "Montréal",
  LaSalle: "Montréal",
  Lachine: "Montréal",

  // Outaouais (07)
  Gatineau: "Outaouais",
  Hull: "Outaouais",
  Aylmer: "Outaouais",
  Buckingham: "Outaouais",
  "Val-des-Monts": "Outaouais",
  Maniwaki: "Outaouais",

  // Abitibi-Témiscamingue (08)
  Rouyn: "Abitibi-Témiscamingue",
  "Rouyn-Noranda": "Abitibi-Témiscamingue",
  "Val-d'Or": "Abitibi-Témiscamingue",
  Amos: "Abitibi-Témiscamingue",
  "La Sarre": "Abitibi-Témiscamingue",

  // Côte-Nord (09)
  "Sept-Îles": "Côte-Nord",
  "Baie-Comeau": "Côte-Nord",
  "Port-Cartier": "Côte-Nord",
  Havre: "Côte-Nord",
  "Havre-Saint-Pierre": "Côte-Nord",

  // Nord-du-Québec (10)
  Chibougamau: "Nord-du-Québec",
  Lebel: "Nord-du-Québec",
  "Lebel-sur-Quévillon": "Nord-du-Québec",
  Chapais: "Nord-du-Québec",

  // Gaspésie–Îles-de-la-Madeleine (11)
  Gaspé: "Gaspésie-Îles-de-la-Madeleine",
  "Îles-de-la-Madeleine": "Gaspésie-Îles-de-la-Madeleine",
  Chandler: "Gaspésie-Îles-de-la-Madeleine",
  "New Richmond": "Gaspésie-Îles-de-la-Madeleine",
  Percé: "Gaspésie-Îles-de-la-Madeleine",

  // Chaudière-Appalaches (12)
  Lévis: "Chaudière-Appalaches",
  Thetford: "Chaudière-Appalaches",
  "Thetford Mines": "Chaudière-Appalaches",
  "Saint-Georges": "Chaudière-Appalaches",
  Montmagny: "Chaudière-Appalaches",
  Sainte: "Chaudière-Appalaches",
  "Sainte-Marie": "Chaudière-Appalaches",

  // Laval (13)
  Laval: "Laval",

  // Lanaudière (14)
  Joliette: "Lanaudière",
  Terrebonne: "Lanaudière",
  Repentigny: "Lanaudière",
  Mascouche: "Lanaudière",
  "L'Assomption": "Lanaudière",
  "Saint-Charles-Borromée": "Lanaudière",

  // Laurentides (15)
  "Saint-Jérôme": "Laurentides",
  Blainville: "Laurentides",
  Boisbriand: "Laurentides",
  "Sainte-Thérèse": "Laurentides",
  "Sainte-Agathe-des-Monts": "Laurentides",
  "Mont-Tremblant": "Laurentides",
  "Saint-Eustache": "Laurentides",
  Mirabel: "Laurentides",

  // Montérégie (16)
  Longueuil: "Montérégie",
  "Saint-Jean-sur-Richelieu": "Montérégie",
  Brossard: "Montérégie",
  "Saint-Hyacinthe": "Montérégie",
  Châteauguay: "Montérégie",
  Drummondville: "Montérégie",
  Granby: "Montérégie",
  "Saint-Bruno-de-Montarville": "Montérégie",
  Chambly: "Montérégie",
  Beloeil: "Montérégie",
  Sorel: "Montérégie",
  "Sorel-Tracy": "Montérégie",
  Vaudreuil: "Montérégie",
  "Vaudreuil-Dorion": "Montérégie",
  Salaberry: "Montérégie",
  "Salaberry-de-Valleyfield": "Montérégie",

  // Centre-du-Québec (17)
  Victoriaville: "Centre-du-Québec",
  Drummondville: "Centre-du-Québec",
  Plessisville: "Centre-du-Québec",
  Nicolet: "Centre-du-Québec",
}

/**
 * Validates if coordinates are within Quebec boundaries
 */
export function isInQuebec(latitude: number, longitude: number): boolean {
  // Quebec approximate boundaries
  const MIN_LAT = 45.0
  const MAX_LAT = 62.0
  const MIN_LON = -79.8
  const MAX_LON = -57.1

  return latitude >= MIN_LAT && latitude <= MAX_LAT && longitude >= MIN_LON && longitude <= MAX_LON
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      console.log(`[v0] Retry attempt ${attempt + 1}/${maxRetries} failed:`, error.message)

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        console.log(`[v0] Waiting ${delay}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Max retries exceeded")
}

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === "AbortError") {
      throw new Error("Request timeout")
    }
    throw error
  }
}

/**
 * Extract city name from Quebec geocoding API address
 */
export function extractCityFromAddress(address: string): string | null {
  // Format: "3424 avenue Monseigneur-Gosselin, Québec G1C5J3"
  const parts = address.split(",")
  if (parts.length < 2) return null

  // Get the part before the postal code
  const cityPart = parts[1].trim()
  // Remove postal code if present
  const city = cityPart.split(/\s+[A-Z]\d[A-Z]/)[0].trim()

  return city || null
}

/**
 * Infer administrative region from city name
 */
export function inferRegionFromCity(city: string): string | null {
  // Try exact match first
  if (QUEBEC_CITY_TO_REGION[city]) {
    return QUEBEC_CITY_TO_REGION[city]
  }

  // Try case-insensitive match
  const cityLower = city.toLowerCase()
  for (const [knownCity, region] of Object.entries(QUEBEC_CITY_TO_REGION)) {
    if (knownCity.toLowerCase() === cityLower) {
      return region
    }
  }

  // Try partial match (for cities with arrondissements)
  for (const [knownCity, region] of Object.entries(QUEBEC_CITY_TO_REGION)) {
    if (cityLower.includes(knownCity.toLowerCase()) || knownCity.toLowerCase().includes(cityLower)) {
      return region
    }
  }

  return null
}
