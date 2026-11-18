import type { RollOptions } from "@client/dice/_types.mjs";
import { CharacterData } from "../../data/actor/character.js";
import { NPCData } from "../../data/actor/npc.js";
import { determinePriorityCamp } from "../../rules/conflit/initiative.js";
import { PRIORITY_CAMP_FLAG, SCOPE_FLAG } from "../../rules/conflit/phases.js";
import {
  getConflictCamps,
  getPlayerCampId,
  validateConflictGroups,
} from "./conflict-groups.js";

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
