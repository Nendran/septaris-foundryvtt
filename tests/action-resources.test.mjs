import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  consumeActionResource,
  getActionResources,
  initializeActionResources,
  refreshActionResources,
  restoreActionResource,
  validateActionResources,
} from "../scripts/foundry/combat/action-resources.js";

const keys = ["major", "minor", "movement", "reaction"];
const defaultResources = (cycle = 1) => ({
  major: 1,
  minor: 1,
  movement: 1,
  reaction: 1,
  lastRefreshCycle: cycle,
});

function mockCombatant(initial) {
  const flags = new Map();
  const writes = [];
  if (initial !== undefined)
    flags.set("septaris:resources", structuredClone(initial));
  return {
    writes,
    getFlag(scope, key) {
      return flags.get(`${scope}:${key}`);
    },
    async setFlag(scope, key, value) {
      const copy = structuredClone(value);
      flags.set(`${scope}:${key}`, copy);
      writes.push({ scope, key, value: copy });
      return copy;
    },
  };
}

describe("Ressources d'action — initialisation et validation", () => {
  it("initialise les quatre ressources à 1 et mémorise le cycle", async () => {
    const combatant = mockCombatant();
    await initializeActionResources(combatant, 3);
    assert.deepEqual(getActionResources(combatant), defaultResources(3));
    assert.equal(combatant.writes.length, 1);
  });

  it("la valeur par défaut du cycle est 1", async () => {
    const combatant = mockCombatant();
    await initializeActionResources(combatant);
    assert.deepEqual(getActionResources(combatant), defaultResources());
  });

  it("n'écrase pas des ressources déjà présentes", async () => {
    const combatant = mockCombatant({ ...defaultResources(2), minor: 0 });
    await initializeActionResources(combatant, 3);
    assert.deepEqual(getActionResources(combatant), {
      ...defaultResources(2),
      minor: 0,
    });
    assert.equal(combatant.writes.length, 0);
  });

  for (const cycle of [-1, 0, 1.5, NaN, Infinity]) {
    it(`refuse un cycle initial invalide : ${cycle}`, async () => {
      const combatant = mockCombatant();
      await assert.rejects(initializeActionResources(combatant, cycle));
      assert.equal(combatant.writes.length, 0);
    });
  }

  for (const value of [undefined, null, [], false, 42, "incorrect"]) {
    it(`rejette un flag ressources mal formé : ${String(value)}`, () => {
      const combatant = mockCombatant(value);
      assert.throws(() => validateActionResources(combatant));
    });
  }

  for (const invalid of [
    { ...defaultResources(), major: -1 },
    { ...defaultResources(), minor: 0.5 },
    { ...defaultResources(), movement: "1" },
    { ...defaultResources(), reaction: NaN },
    { ...defaultResources(), lastRefreshCycle: 0 },
    { ...defaultResources(), lastRefreshCycle: 1.5 },
    { ...defaultResources(), extra: 1 },
    { major: 1, minor: 1, movement: 1, lastRefreshCycle: 1 },
  ]) {
    it(`rejette une configuration invalide : ${JSON.stringify(invalid)}`, () => {
      const combatant = mockCombatant(invalid);
      assert.throws(() => getActionResources(combatant));
    });
  }
});

describe("Ressources d'action — consommation et restitution", () => {
  for (const resource of keys) {
    it(`consomme uniquement la ressource ${resource}`, async () => {
      const combatant = mockCombatant(defaultResources());
      await consumeActionResource(combatant, resource);
      assert.deepEqual(getActionResources(combatant), {
        ...defaultResources(),
        [resource]: 0,
      });
    });

    it(`ne peut pas consommer deux fois ${resource} dans le même cycle`, async () => {
      const combatant = mockCombatant({ ...defaultResources(), [resource]: 0 });
      await assert.rejects(consumeActionResource(combatant, resource));
      assert.equal(combatant.writes.length, 0);
    });

    it(`peut restituer ${resource}`, async () => {
      const combatant = mockCombatant({ ...defaultResources(), [resource]: 0 });
      await restoreActionResource(combatant, resource);
      assert.deepEqual(getActionResources(combatant), defaultResources());
    });
  }
});

describe("Ressources d'action — renouvellement du cycle", () => {
  it("renouvelle toutes les ressources uniquement au cycle suivant", async () => {
    const combatant = mockCombatant({
      ...defaultResources(2),
      major: 0,
      movement: 0,
    });
    await refreshActionResources(combatant, 3);
    assert.deepEqual(getActionResources(combatant), defaultResources(3));
  });

  it("ne renouvelle pas les ressources dans le même cycle", async () => {
    const combatant = mockCombatant({ ...defaultResources(2), major: 0 });
    await refreshActionResources(combatant, 2);
    assert.equal(getActionResources(combatant).major, 0);
    assert.equal(combatant.writes.length, 0);
  });

  it("ne revient pas en arrière lors d'une transition vers un ancien cycle", async () => {
    const combatant = mockCombatant({ ...defaultResources(4), reaction: 0 });
    await refreshActionResources(combatant, 3);
    assert.deepEqual(getActionResources(combatant), {
      ...defaultResources(4),
      reaction: 0,
    });
    assert.equal(combatant.writes.length, 0);
  });

  it("reconstitue exactement une réaction, même après consommation", async () => {
    const combatant = mockCombatant({ ...defaultResources(), reaction: 0 });
    await refreshActionResources(combatant, 2);
    assert.equal(getActionResources(combatant).reaction, 1);
  });
});
