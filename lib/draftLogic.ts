// Snake draft logic. Single source of truth for "whose turn is it".
//
// Entrants are ordered 1..N by draft_position (set by the random draw, done outside the app).
// Round 1: position 1 -> N
// Round 2: position N -> 1
// Round 3: position 1 -> N
// ...alternating for `totalRounds`.
//
// pick_number is the global 1-indexed sequence across the whole draft (1..N*totalRounds).
// This is the column the app actually persists on `picks`, so re-deriving "current turn"
// is just: count existing picks, pick_number = count + 1.

export type RoundMultipliers = Record<string, number>;

export const DEFAULT_MULTIPLIERS: RoundMultipliers = {
  "1": 1, "2": 1, "3": 1,
  "4": 2, "5": 2, "6": 2, "7": 2,
  "8": 3, "9": 3, "10": 3,
};

export interface DraftSlot {
  pickNumber: number;
  round: number;
  draftPosition: number; // which entrant (by draft_position) picks in this slot
  multiplier: number;
}

/**
 * Given the number of entrants and total rounds, return the full ordered draft board
 * (all pick slots in sequence). Index 0 = pick_number 1.
 */
export function buildDraftOrder(
  numEntrants: number,
  totalRounds: number,
  multipliers: RoundMultipliers = DEFAULT_MULTIPLIERS
): DraftSlot[] {
  const slots: DraftSlot[] = [];
  let pickNumber = 1;

  for (let round = 1; round <= totalRounds; round++) {
    const ascending = round % 2 === 1; // odd rounds: 1 -> N, even rounds: N -> 1
    const positions = Array.from({ length: numEntrants }, (_, i) => i + 1);
    const order = ascending ? positions : positions.reverse();

    for (const draftPosition of order) {
      slots.push({
        pickNumber,
        round,
        draftPosition,
        multiplier: multipliers[String(round)] ?? 1,
      });
      pickNumber++;
    }
  }

  return slots;
}

/**
 * Given how many picks have already been made, return the next slot to fill (or null if
 * the draft is complete).
 */
export function getCurrentSlot(
  picksMadeCount: number,
  numEntrants: number,
  totalRounds: number,
  multipliers?: RoundMultipliers
): DraftSlot | null {
  const order = buildDraftOrder(numEntrants, totalRounds, multipliers);
  return order[picksMadeCount] ?? null; // 0-indexed array, pick_number is 1-indexed
}

/**
 * Map a draft_position (1..N) to the actual entrant record, given the list of entrants
 * sorted by draft_position ascending.
 */
export function entrantForPosition<T extends { draft_position: number }>(
  entrants: T[],
  draftPosition: number
): T | undefined {
  return entrants.find((e) => e.draft_position === draftPosition);
}
