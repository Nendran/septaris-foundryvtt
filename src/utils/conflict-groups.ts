import { PLAYER_CAMP_ID_FLAG, SCOPE_FLAG } from "./conflict.js";

export type ConflictCamp = {
  id: string;
  name: string;
  members: {
    id: string;
    name: string;
  }[];
};

export function getConflictCamps(combat: SeptarisCombat): ConflictCamp[] {
  return combat.groups.contents.flatMap((group: ConflictCamp) => {
    if (!group.id) return [];

    const members = [...group.members].flatMap((member) => {
      if (!member.id) return [];

      return [
        {
          id: member.id,
          name: member.name,
        },
      ];
    });

    return [
      {
        id: group.id,
        name: group.name ?? group.id,
        members,
      },
    ];
  });
}

export function getUnassignedCombatants(
  combat: SeptarisCombat,
): { id: string; name: string }[] {
  const membersInCamps = getConflictCamps(combat).flatMap((camp) =>
    camp.members.map((member) => member.id),
  );

  return [...combat.combatants].flatMap((combatant) => {
    if (!combatant.id || membersInCamps.includes(combatant.id)) return [];

    return [
      {
        id: combatant.id,
        name: combatant.name,
      },
    ];
  });
}

export function validateConflictGroups(combat: SeptarisCombat): void {
  const camps = getConflictCamps(combat);
  const unassignedCombatants = getUnassignedCombatants(combat);

  if (camps.length !== 2) {
    throw new Error("SEPTARIS | There must be exactly two conflict camps.");
  }
  camps.forEach((camp) => {
    if (camp.members.length === 0) {
      throw new Error(
        `SEPTARIS | Conflict camp "${camp.name}" must have at least one member.`,
      );
    }
  });
  if (unassignedCombatants.length > 0) {
    throw new Error(
      "SEPTARIS | All combatants must be assigned to a conflict camp.",
    );
  }
}

export async function initializeConflictGroups(
  combat: SeptarisCombat,
): Promise<foundry.documents.CombatantGroup<Combat>[]> {
  const groups = combat.groups;
  if (groups.size === 2) {
    return groups.contents;
  }

  if (groups.size !== 0) {
    throw new Error("SEPTARIS | Expected 0 or 2 conflict groups.");
  }

  await combat.createEmbeddedDocuments("CombatantGroup", [
    { name: "Camp A", type: "base" },
    { name: "Camp B", type: "base" },
  ]);

  return combat.groups.contents;
}

export async function assignCombatantToCamp(
  combat: SeptarisCombat,
  combatantId: string,
  campId: string,
): Promise<void> {
  const combatant = combat.combatants.get(combatantId);
  const combatGroup = combat.groups.get(campId);

  if (!combatant) {
    throw new Error(`SEPTARIS | Combatant with ID "${combatantId}" not found.`);
  }
  if (!combatGroup) {
    throw new Error(`SEPTARIS | Camp with ID "${campId}" not found.`);
  }

  if (combatGroup.members.has(combatant)) {
    return;
  }

  await combatant.update({ group: campId });
}

export function getPlayerCampId(combat: SeptarisCombat): string | null {
  const playerCampId = combat.getFlag("septaris", "playerCampId");

  if (playerCampId === undefined) {
    return null;
  }

  if (typeof playerCampId !== "string") {
    throw new Error(
      "SEPTARIS | Player camp ID is not a string. This may indicate a corrupted flag value.",
    );
  }

  return playerCampId;
}

export async function setPlayerCampId(
  combat: SeptarisCombat,
  campId: string,
): Promise<void> {
  if (!combat.groups.has(campId)) {
    throw new Error(`SEPTARIS | Camp with ID "${campId}" not found.`);
  }

  if (getPlayerCampId(combat) === campId) {
    return;
  }

  await combat.setFlag(SCOPE_FLAG, PLAYER_CAMP_ID_FLAG, campId);
}
