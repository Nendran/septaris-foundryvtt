import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Doubles minimaux permettant de charger les TypeDataModels dans Node.
// Aucun DOM ni instance réelle de Foundry ne sont requis.
globalThis.foundry = {
  abstract: { TypeDataModel: class {} },
  data: { fields: {} },
};

const { CharacterData } = await import("../scripts/data/actor/character.js");
const { NPCData } = await import("../scripts/data/actor/npc.js");
const { rollCombatantInitiative, rollConflictInitiative } = await import(
  "../scripts/foundry/combat/conflict-initiative.js"
);

const dice = [];
const constructedRolls = [];
globalThis.Roll = class MockRoll {
  constructor(formula, data, options) {
    this.formula = formula;
    this.data = data;
    this.options = options;
    constructedRolls.push(this);
  }

  async evaluate() {
    const face = dice.shift();
    if (face === undefined) throw new Error("Aucun dé simulé disponible");
    return { total: face + this.data.mod };
  }
};

function actorSystem(Model, dexterityModifier) {
  const system = new Model();
  system.characteristicsModifiers = { dexterity: dexterityModifier };
  return { name: "Test", system };
}

function makeCombatant(id, camp, ActorModel, modifier, initiative = null) {
  return {
    id,
    name: id,
    camp,
    initiative,
    actor: actorSystem(ActorModel, modifier),
    updateCalls: [],
    async update(data) {
      this.updateCalls.push(data);
      Object.assign(this, data);
    },
  };
}

function makeCombat(combatants) {
  const groups = [
    {
      id: "pj",
      name: "Joueurs",
      members: new Set(combatants.filter((c) => c.camp === "pj")),
    },
    {
      id: "pnj",
      name: "Opposants",
      members: new Set(combatants.filter((c) => c.camp === "pnj")),
    },
  ];
  return {
    flags: new Map([["septaris:playerCampId", "pj"]]),
    groups: { contents: groups },
    combatants: {
      get: (id) => combatants.find((c) => c.id === id),
      [Symbol.iterator]: function* () {
        yield* combatants;
      },
    },
    getFlag(scope, key) {
      return this.flags.get(`${scope}:${key}`);
    },
    async setFlag(scope, key, value) {
      this.flags.set(`${scope}:${key}`, value);
    },
  };
}

function resetDice(...faces) {
  dice.splice(0, dice.length, ...faces);
  constructedRolls.length = 0;
}

describe("Initiative Foundry — jets individuels", () => {
  it("calcule un seul d20 + mod. DEX sans dé de Prouesse", async () => {
    resetDice(12);
    const combatant = makeCombatant("p1", "pj", CharacterData, 3);
    const result = await rollCombatantInitiative(combatant);
    assert.equal(result, 15);
    assert.equal(combatant.initiative, 15);
    assert.equal(constructedRolls.length, 1);
    assert.equal(constructedRolls[0].formula, "1d20 + @mod");
    assert.deepEqual(constructedRolls[0].data, { mod: 3 });
  });

  it("accepte aussi un PNJ", async () => {
    resetDice(8);
    const combatant = makeCombatant("n1", "pnj", NPCData, -2);
    assert.equal(await rollCombatantInitiative(combatant), 6);
  });

  it("ne relance pas un combattant avec une initiative déjà enregistrée", async () => {
    resetDice();
    const combatant = makeCombatant("p1", "pj", CharacterData, 1, 21);
    assert.equal(await rollCombatantInitiative(combatant), 21);
    assert.equal(constructedRolls.length, 0);
    assert.equal(combatant.updateCalls.length, 0);
  });

  it("rejette un combattant sans acteur", async () => {
    const combatant = makeCombatant("p1", "pj", CharacterData, 0);
    combatant.actor = null;
    await assert.rejects(rollCombatantInitiative(combatant));
  });

  it("rejette un acteur sans modèle Septaris", async () => {
    const combatant = makeCombatant("p1", "pj", CharacterData, 0);
    combatant.actor.system = {};
    await assert.rejects(rollCombatantInitiative(combatant));
  });
});

describe("Initiative Foundry — meilleur jet de camp et priorité", () => {
  it("calcule les initiatives après les jets et retient le meilleur de chaque camp", async () => {
    resetDice(4, 17, 13);
    const combatants = [
      makeCombatant("p1", "pj", CharacterData, 0),
      makeCombatant("p2", "pj", CharacterData, 1),
      makeCombatant("n1", "pnj", NPCData, 0),
    ];
    const combat = makeCombat(combatants);
    await rollConflictInitiative(combat);
    assert.deepEqual(
      combatants.map((c) => c.initiative),
      [4, 18, 13],
    );
    assert.equal(combat.getFlag("septaris", "priorityCamp"), "pj");
    assert.equal(constructedRolls.length, 3);
  });

  it("le camp adverse gagne si son meilleur jet est supérieur", async () => {
    resetDice(8, 16);
    const combat = makeCombat([
      makeCombatant("p1", "pj", CharacterData, 1),
      makeCombatant("n1", "pnj", NPCData, 0),
    ]);
    await rollConflictInitiative(combat);
    assert.equal(combat.getFlag("septaris", "priorityCamp"), "pnj");
  });

  it("une égalité de meilleurs jets privilégie les PJ", async () => {
    resetDice(10, 11);
    const combat = makeCombat([
      makeCombatant("p1", "pj", CharacterData, 1),
      makeCombatant("n1", "pnj", NPCData, 0),
    ]);
    await rollConflictInitiative(combat);
    assert.equal(combat.getFlag("septaris", "priorityCamp"), "pj");
  });

  it("rejette un conflit avec un combattant sans camp", async () => {
    resetDice();
    const combat = makeCombat([
      makeCombatant("p1", "pj", CharacterData, 1),
      makeCombatant("n1", "pnj", NPCData, 0),
      makeCombatant("p2", "aucun", CharacterData, 1),
    ]);
    await assert.rejects(rollConflictInitiative(combat));
    assert.equal(constructedRolls.length, 0);
  });
});
