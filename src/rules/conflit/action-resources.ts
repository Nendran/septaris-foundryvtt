import { RESOURCES_ACTION_FLAG, SCOPE_FLAG } from "./phases";
import type { SeptarisResourcesAction } from "./types";

export function validateActionResources(
  combatant: foundry.documents.Combatant,
): SeptarisResourcesAction {
  const resources = combatant.getFlag(SCOPE_FLAG, RESOURCES_ACTION_FLAG);

  if (
    typeof resources !== "object" ||
    resources === null ||
    Array.isArray(resources)
  ) {
    throw new Error(`SEPTARIS | ${RESOURCES_ACTION_FLAG} is invalid`);
  }

  const expectedKeys = [
    "major",
    "minor",
    "movement",
    "reaction",
    "lastRefreshCycle",
  ];

  const actualKeys = Object.keys(resources);

  if (
    actualKeys.length !== expectedKeys.length ||
    !expectedKeys.every((key) => Object.hasOwn(resources, key))
  ) {
    throw new Error("SEPTARIS | Resources has invalid keys");
  }

  const values = resources as Record<string, unknown>;

  for (const key of expectedKeys) {
    const value = values[key];

    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < (key === "lastRefreshCycle" ? 1 : 0)
    ) {
      throw new Error(`SEPTARIS | Invalid resource value: ${key}`);
    }
  }

  return values as SeptarisResourcesAction;
}
