/**
 * corner-names.ts
 *
 * Circuit corner names database for iconic F1 tracks.
 * Provides authentic racing nomenclature for turns (e.g. Monza, Spa, Silverstone, Suzuka, Monaco).
 */

const FAMOUS_CORNERS: Record<string, Record<number, string>> = {
  // Monza (Italian GP)
  "italian": {
    1: "Variante del Rettifilo",
    2: "Variante del Rettifilo",
    3: "Curva Grande",
    4: "Variante della Roggia",
    5: "Variante della Roggia",
    6: "Curva del Serraglio",
    7: "Lesmo 1",
    8: "Lesmo 2",
    9: "Variante Ascari",
    10: "Variante Ascari",
    11: "Curva Parabolica",
  },
  // Spa-Francorchamps (Belgian GP)
  "belgian": {
    1: "La Source",
    2: "Eau Rouge",
    3: "Eau Rouge",
    4: "Raidillon",
    5: "Les Combes",
    6: "Les Combes",
    7: "Malmedy",
    8: "Bruxelles",
    9: "Speakers Corner",
    10: "Pouhon",
    11: "Pouhon",
    12: "Campus",
    13: "Stavelot",
    14: "Courbe Paul Frère",
    15: "Blanchimont",
    16: "Blanchimont",
    17: "Chicane",
    18: "Bus Stop Chicane",
    19: "Bus Stop Chicane",
  },
  // Silverstone (British GP)
  "british": {
    1: "Abbey",
    2: "Farm",
    3: "Village",
    4: "The Loop",
    5: "Aintree",
    6: "Wellington Straight",
    7: "Brooklands",
    8: "Luffield",
    9: "Copse",
    10: "Maggotts",
    11: "Becketts",
    12: "Chapel",
    13: "Hangar Straight",
    14: "Stowe",
    15: "Stowe",
    16: "Vale",
    17: "Club",
    18: "Club",
  },
  // Suzuka (Japanese GP)
  "japanese": {
    1: "First Corner",
    2: "Second Corner",
    3: "S-Curves",
    4: "S-Curves",
    5: "S-Curves",
    6: "Dunlop Curve",
    7: "Degner 1",
    8: "Degner 1",
    9: "Degner 2",
    11: "Hairpin",
    13: "Spoon Curve",
    14: "Spoon Curve",
    15: "130R",
    16: "Casio Triangle",
    17: "Casio Triangle",
  },
  // Monaco
  "monaco": {
    1: "Sainte Dévote",
    2: "Beau Rivage",
    3: "Massenet",
    4: "Casino",
    5: "Mirabeau Haute",
    6: "Grand Hotel Hairpin",
    7: "Mirabeau Bas",
    8: "Portier",
    9: "The Tunnel",
    10: "Nouvelle Chicane",
    11: "Nouvelle Chicane",
    12: "Tabac",
    13: "Louis Chiron",
    14: "Swimming Pool",
    15: "Swimming Pool",
    16: "Swimming Pool",
    17: "La Rascasse",
    18: "Anthony Noghès",
    19: "Anthony Noghès",
  },
};

/**
 * Returns a human-friendly turn name if known, or fallback to 'Turn N'.
 */
export function getCornerFriendlyName(
  eventName: string,
  cornerNumber: number,
  cornerLetter?: string
): string {
  const normalizedEvent = (eventName || "").toLowerCase();
  
  for (const [key, map] of Object.entries(FAMOUS_CORNERS)) {
    if (normalizedEvent.includes(key)) {
      const match = map[cornerNumber];
      if (match) return match;
    }
  }

  const suffix = cornerLetter ? `${cornerLetter}` : "";
  return `Turn ${cornerNumber}${suffix}`;
}
