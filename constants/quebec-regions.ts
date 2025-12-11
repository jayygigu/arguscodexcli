export const QUEBEC_REGIONS = [
  "Bas-Saint-Laurent",
  "Saguenay–Lac-Saint-Jean",
  "Capitale-Nationale",
  "Mauricie",
  "Estrie",
  "Montréal",
  "Outaouais",
  "Abitibi-Témiscamingue",
  "Côte-Nord",
  "Nord-du-Québec",
  "Gaspésie–Îles-de-la-Madeleine",
  "Chaudière-Appalaches",
  "Laval",
  "Lanaudière",
  "Laurentides",
  "Montérégie",
  "Centre-du-Québec",
] as const

export type QuebecRegion = (typeof QUEBEC_REGIONS)[number]

export const QUEBEC_MAJOR_CITIES = [
  "Montréal",
  "Québec",
  "Laval",
  "Gatineau",
  "Longueuil",
  "Sherbrooke",
  "Saguenay",
  "Trois-Rivières",
] as const

export type QuebecMajorCity = (typeof QUEBEC_MAJOR_CITIES)[number]

export function validateQuebecPostalCode(postalCode: string): boolean {
  // Quebec postal codes start with G, H, or J
  const quebecPostalCodeRegex = /^[GHJ]\d[A-Z]\s?\d[A-Z]\d$/i
  return quebecPostalCodeRegex.test(postalCode.trim())
}

export function formatQuebecPostalCode(postalCode: string): string {
  // Format to "H1A 1A1"
  const cleaned = postalCode.replace(/\s/g, "").toUpperCase()
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
  }
  return postalCode
}
