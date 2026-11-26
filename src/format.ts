/**
 * Some source rows publish bilingual values joined by "|", for example
 * "Edmonton|Edmonton" or "Montreal | Montréal". Show the first part.
 */
export function firstPart(value: string | null | undefined): string | null {
  const text = value?.split("|", 1)[0].trim();
  return text ? text : null;
}

/** "City, PROVINCE" with whichever parts are published. */
export function placeName(city: string | null | undefined, province: string | null | undefined): string {
  return [firstPart(city), province].filter(Boolean).join(", ");
}
