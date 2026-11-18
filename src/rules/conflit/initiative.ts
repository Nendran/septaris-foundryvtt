import {
  type ConflictCamp,
  getConflictCamps,
  getPlayerCampId,
  validateConflictGroups,
} from "../../foundry/combat/conflict-groups";

export function determinePriorityCamp(combat: SeptarisCombat): string {
  validateConflictGroups(combat);
  const camps = getConflictCamps(combat);
  const initiativeCamps = camps.map((camp) => {
    const initiativeCamp = getCampInitiative(combat, camp);
    return { id: camp.id, initiative: initiativeCamp };
  });

  if (initiativeCamps[0].initiative === initiativeCamps[1].initiative) {
    const playerCampId = getPlayerCampId(combat);
    if (!playerCampId) {
      throw new Error("SEPTARIS | Could not determine player camp.");
    }
    if (!initiativeCamps.some((c) => c.id === playerCampId)) {
      throw new Error(
        "SEPTARIS | Player camp is not part of the conflict camps.",
      );
    }
    return playerCampId;
  }

  const maxInitiative = Math.max(...initiativeCamps.map((c) => c.initiative));

  const priorityCamp = initiativeCamps.find(
    (c) => c.initiative === maxInitiative,
  )?.id;

  if (!priorityCamp) {
    throw new Error("SEPTARIS | Could not determine priority camp.");
  }

  return priorityCamp;
}

function getCampInitiative(combat: SeptarisCombat, camp: ConflictCamp): number {
  if (camp.members.length === 0) {
    throw new Error(`SEPTARIS | Conflict camp ${camp.name} has no members.`);
  }
  let initiativeCamp = -Infinity;
  for (const member of camp.members) {
    const combatant = combat.combatants.get(member.id);
    if (!combatant) {
      throw new Error(
        `SEPTARIS | Combatant with ID ${member.id} not found in combat.`,
      );
    }
    if (
      combatant.initiative === null ||
      combatant.initiative === undefined ||
      !Number.isFinite(combatant.initiative)
    ) {
      throw new Error(
        `SEPTARIS | Combatant ${combatant.name} in camp ${camp.name} has no initiative value or an invalid value.`,
      );
    }
    const initiative = combatant.initiative;
    if (initiative > initiativeCamp) {
      initiativeCamp = initiative;
    }
  }
  return initiativeCamp;
}
