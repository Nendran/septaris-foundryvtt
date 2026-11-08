import type { RollOptions } from "@client/dice/_types.mjs";
import { CharacterData } from "../data/actor/character.js";
import { NPCData } from "../data/actor/npc.js";
import { PRIORITY_CAMP_FLAG, SCOPE_FLAG } from "./conflict.js";
import {
  type ConflictCamp,
  getConflictCamps,
  getPlayerCampId,
  validateConflictGroups,
} from "./conflict-groups.js";

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

export async function rollCombatantInitiative(
  combatant: foundry.documents.Combatant<Combat>,
  options: RollOptions = {},
): Promise<number> {
  if (
    combatant.initiative !== null &&
    combatant.initiative !== undefined &&
    Number.isFinite(combatant.initiative)
  ) {
    return combatant.initiative;
  }
  const actor = combatant.actor;
  if (!actor) {
    throw new Error(
      `SEPTARIS | Combatant ${combatant.name} has no associated actor.`,
    );
  }
  const systemData = actor.system;
  if (!(systemData instanceof CharacterData || systemData instanceof NPCData)) {
    throw new Error(
      `SEPTARIS | Actor ${actor.name} has an invalid system data type.`,
    );
  }

  const mod = systemData.characteristicsModifiers.dexterity;
  const roll = await new Roll("1d20 + @mod", { mod }, options).evaluate();
  await combatant.update({ initiative: roll.total });

  return roll.total;
}

export async function rollConflictInitiative(
  combat: SeptarisCombat,
  options: RollOptions = {},
): Promise<void> {
  validateConflictGroups(combat);
  const playerCampId = getPlayerCampId(combat);
  if (
    !playerCampId ||
    !getConflictCamps(combat).some((camp) => camp.id === playerCampId)
  ) {
    throw new Error(`SEPTARIS | PlayerCampId is not in conflit's camps`);
  }
  const promiseArray: Promise<number>[] = [];
  for (const combatant of combat.combatants) {
    promiseArray.push(rollCombatantInitiative(combatant, options));
  }
  await Promise.all(promiseArray).catch((error) => {
    console.error("SEPTARIS | Error rolling initiative for combatants:", error);
    throw error;
  });
  await combat.setFlag(
    SCOPE_FLAG,
    PRIORITY_CAMP_FLAG,
    determinePriorityCamp(combat),
  );
}
