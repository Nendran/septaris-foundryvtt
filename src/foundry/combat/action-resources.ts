import { validateActionResources } from "../../rules/conflit/action-resources";
import { RESOURCES_ACTION_FLAG, SCOPE_FLAG } from "../../rules/conflit/phases";
import type {
  SeptarisResource,
  SeptarisResourcesAction,
} from "../../rules/conflit/types";

export function getActionResources(
  combatant: foundry.documents.Combatant,
): SeptarisResourcesAction {
  const resources = validateActionResources(combatant);

  return resources;
}

export async function initializeActionResources(
  combatant: foundry.documents.Combatant,
  currentCycle: number = 1,
): Promise<void> {
  const resources = combatant.getFlag(SCOPE_FLAG, RESOURCES_ACTION_FLAG);

  if (resources !== undefined) {
    validateActionResources(combatant);
    return;
  }

  if (!Number.isInteger(currentCycle) || currentCycle < 1) {
    throw new Error("SEPTARIS | Invalid current cycle");
  }

  const newResources: SeptarisResourcesAction = {
    major: 1,
    minor: 1,
    movement: 1,
    reaction: 1,
    lastRefreshCycle: currentCycle,
  };

  await setResourceActions(combatant, newResources);
}

export async function consumeActionResource(
  combatant: foundry.documents.Combatant,
  resource: SeptarisResource,
): Promise<void> {
  const resources = validateActionResources(combatant);
  const consumeResource = resources[resource];

  if (consumeResource <= 0) {
    throw new Error(
      `SEPTARIS | resource ${resource} couldn't be less or equal than 0`,
    );
  }

  const newResources = {
    ...resources,
  };

  newResources[resource] = consumeResource - 1;

  await setResourceActions(combatant, newResources);
}

export async function restoreActionResource(
  combatant: foundry.documents.Combatant,
  resource: SeptarisResource,
) {
  const resources = validateActionResources(combatant);

  const newResources = {
    ...resources,
  };

  newResources[resource] = 1;

  await setResourceActions(combatant, newResources);
}

export async function refreshActionResources(
  combatant: foundry.documents.Combatant,
  currentCycle: number,
): Promise<void> {
  const resources = validateActionResources(combatant);

  if (resources.lastRefreshCycle >= currentCycle) {
    return;
  }

  const newResources: SeptarisResourcesAction = {
    major: 1,
    minor: 1,
    movement: 1,
    reaction: 1,
    lastRefreshCycle: currentCycle,
  };

  await setResourceActions(combatant, newResources);
}

async function setResourceActions(
  combatant: foundry.documents.Combatant,
  resources: SeptarisResourcesAction,
): Promise<void> {
  await combatant.setFlag(SCOPE_FLAG, RESOURCES_ACTION_FLAG, resources);
  validateActionResources(combatant);
}
