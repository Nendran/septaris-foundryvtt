import type { ConflictCamp } from "./types.js";

export function determinePriorityCamp(
  camps: ConflictCamp[],
  playerCampId: string,
): string {
  if (camps[0].initiative === camps[1].initiative) {
    if (!camps.some((c) => c.id === playerCampId)) {
      throw new Error(
        "SEPTARIS | Player camp is not part of the conflict camps.",
      );
    }
    return playerCampId;
  }

  const maxInitiative = Math.max(...camps.map((c) => c.initiative));

  const priorityCamp = camps.find((c) => c.initiative === maxInitiative)?.id;

  if (!priorityCamp) {
    throw new Error("SEPTARIS | Could not determine priority camp.");
  }

  return priorityCamp;
}
