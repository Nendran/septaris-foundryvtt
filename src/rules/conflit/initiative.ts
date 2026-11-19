import type { CampInitiative, ConflictCamp } from "./types.js";

export function determinePriorityCamp(
  camps: ConflictCamp[],
  playerCampId: string,
  campsInitiative: CampInitiative[],
): string {
  if (campsInitiative[0].initiative === campsInitiative[1].initiative) {
    if (!camps.some((c) => c.id === playerCampId)) {
      throw new Error(
        "SEPTARIS | Player camp is not part of the conflict camps.",
      );
    }
    return playerCampId;
  }

  const maxInitiative = Math.max(...campsInitiative.map((c) => c.initiative));

  const priorityCamp = campsInitiative.find(
    (c) => c.initiative === maxInitiative,
  )?.id;

  if (!priorityCamp) {
    throw new Error("SEPTARIS | Could not determine priority camp.");
  }

  return priorityCamp;
}
