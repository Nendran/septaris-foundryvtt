import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assignCombatantToCamp,
  getConflictCamps,
  getPlayerCampId,
  getPlayerCampSize,
  getUnassignedCombatants,
  initializeConflictGroups,
  setPlayerCampId,
  validateConflictGroups,
} from "../scripts/foundry/combat/conflict-groups.js";

// Le mock reproduit uniquement les méthodes du contrat Foundry utilisées
// par le fichier testé. Il ne prétend pas simuler la totalité du moteur VTT.
globalThis.game = {
  i18n: { localize: (key) => key },
};

function fakeCombat({
  players = 2,
  enemies = 1,
  oneGroup = false,
  emptyGroups = false,
} = {}) {
  const combat = {
    flags: new Map(),
    writes: [],
    createCalls: [],
    getFlag(scope, key) {
      return this.flags.get(`${scope}:${key}`);
    },
    async setFlag(scope, key, value) {
      this.flags.set(`${scope}:${key}`, value);
      this.writes.push({ scope, key, value });
      return value;
    },
  };

  const groups = emptyGroups
    ? []
    : [
        { id: "pj", name: "Joueurs", members: new Set() },
        ...(!oneGroup
          ? [{ id: "pnj", name: "Adversaires", members: new Set() }]
          : []),
      ];

  const combatants = [];
  for (let i = 0; i < players; i++) {
    combatants.push({
      id: `p${i + 1}`,
      name: `PJ ${i + 1}`,
      group: "pj",
      initiative: null,
    });
  }
  for (let i = 0; i < enemies; i++) {
    combatants.push({
      id: `n${i + 1}`,
      name: `PNJ ${i + 1}`,
      group: "pnj",
      initiative: null,
    });
  }

  function reassign(combatant, targetId) {
    for (const group of groups) group.members.delete(combatant);
    combatant.group = targetId;
    const target = groups.find((group) => group.id === targetId);
    target?.members.add(combatant);
  }

  for (const combatant of combatants) {
    combatant.calls = [];
    combatant.update = async (change) => {
      combatant.calls.push(change);
      if ("group" in change) reassign(combatant, change.group);
    };
    reassign(combatant, combatant.group);
  }

  combat.groups = {
    get contents() {
      return groups;
    },
    get size() {
      return groups.length;
    },
    get: (id) => groups.find((g) => g.id === id),
    has: (id) => groups.some((g) => g.id === id),
  };
  combat.combatants = {
    get size() {
      return combatants.length;
    },
    get: (id) => combatants.find((c) => c.id === id),
    find: (callback) => combatants.find(callback),
    [Symbol.iterator]: function* () {
      yield* combatants;
    },
  };
  combat.createEmbeddedDocuments = async (kind, entries) => {
    combat.createCalls.push({ kind, entries });
    for (const entry of entries) {
      groups.push({
        id: `new${groups.length + 1}`,
        name: entry.name,
        members: new Set(),
      });
    }
    return groups;
  };
  combat.flags.set("septaris:playerCampId", "pj");

  return combat;
}

describe("Camps Foundry — préparation et participants", () => {
  it("lit des camps sans exiger les initiatives des combattants", () => {
    const combat = fakeCombat();
    assert.deepEqual(getConflictCamps(combat), [
      {
        id: "pj",
        name: "Joueurs",
        members: [
          { id: "p1", name: "PJ 1" },
          { id: "p2", name: "PJ 2" },
        ],
      },
      {
        id: "pnj",
        name: "Adversaires",
        members: [{ id: "n1", name: "PNJ 1" }],
      },
    ]);
  });

  it("les groupes vides sont lisibles avant préparation du conflit", () => {
    const combat = fakeCombat({ players: 0, enemies: 0 });
    assert.equal(getConflictCamps(combat).length, 2);
    assert.equal(getConflictCamps(combat)[0].members.length, 0);
  });

  it("valide deux camps non vides avec tous les participants affectés", () => {
    assert.doesNotThrow(() => validateConflictGroups(fakeCombat()));
  });

  it("rejette un conflit avec un seul camp", () => {
    assert.throws(() => validateConflictGroups(fakeCombat({ oneGroup: true })));
  });

  it("rejette un camp sans combattant", () => {
    assert.throws(() => validateConflictGroups(fakeCombat({ enemies: 0 })));
  });

  it("détecte les combattants non affectés", () => {
    const combat = fakeCombat();
    const orphan = combat.combatants.get("p2");
    combat.groups.get("pj").members.delete(orphan);
    assert.deepEqual(getUnassignedCombatants(combat), [
      { id: "p2", name: "PJ 2" },
    ]);
    assert.throws(() => validateConflictGroups(combat));
  });

  it("compte les membres du camp identifié comme joueur", () => {
    assert.equal(getPlayerCampSize(fakeCombat({ players: 3, enemies: 6 })), 3);
  });

  it("échoue si le camp joueur n'est pas identifié", () => {
    const combat = fakeCombat();
    combat.flags.delete("septaris:playerCampId");
    assert.throws(() => getPlayerCampSize(combat));
  });
});

describe("Camps Foundry — lecture et écriture des flags", () => {
  it("retourne null si le flag joueur est absent", () => {
    const combat = fakeCombat();
    combat.flags.delete("septaris:playerCampId");
    assert.equal(getPlayerCampId(combat), null);
  });

  it("rejette un identifiant de camp joueur corrompu", () => {
    const combat = fakeCombat();
    combat.flags.set("septaris:playerCampId", 123);
    assert.throws(() => getPlayerCampId(combat));
  });

  it("enregistre un camp joueur valide", async () => {
    const combat = fakeCombat();
    await setPlayerCampId(combat, "pnj");
    assert.equal(getPlayerCampId(combat), "pnj");
    assert.equal(combat.writes.length, 1);
  });

  it("n'écrit rien si le camp joueur est inchangé", async () => {
    const combat = fakeCombat();
    await setPlayerCampId(combat, "pj");
    assert.equal(combat.writes.length, 0);
  });

  it("refuse un camp joueur non existant", async () => {
    await assert.rejects(setPlayerCampId(fakeCombat(), "absent"));
  });
});

describe("Camps Foundry — création et affectation", () => {
  it("créé deux groupes Foundry lorsque aucun n'existe", async () => {
    const combat = fakeCombat({ players: 0, enemies: 0, emptyGroups: true });
    const result = await initializeConflictGroups(combat);
    assert.equal(result.length, 2);
    assert.equal(combat.createCalls.length, 1);
    assert.equal(combat.createCalls[0].kind, "CombatantGroup");
  });

  it("réutilise exactement deux groupes existants", async () => {
    const combat = fakeCombat();
    const result = await initializeConflictGroups(combat);
    assert.strictEqual(result, combat.groups.contents);
    assert.equal(combat.createCalls.length, 0);
  });

  it("refuse une structure comportant un seul groupe", async () => {
    await assert.rejects(
      initializeConflictGroups(fakeCombat({ oneGroup: true })),
    );
  });

  it("affecte un combattant à un autre camp", async () => {
    const combat = fakeCombat();
    await assignCombatantToCamp(combat, "p1", "pnj");
    assert.equal(combat.combatants.get("p1").group, "pnj");
    assert.deepEqual(combat.combatants.get("p1").calls, [{ group: "pnj" }]);
  });

  it("ne réaffecte pas un combattant déjà dans son camp", async () => {
    const combat = fakeCombat();
    await assignCombatantToCamp(combat, "p1", "pj");
    assert.deepEqual(combat.combatants.get("p1").calls, []);
  });

  it("refuse un combattant inconnu ou un camp inconnu", async () => {
    const combat = fakeCombat();
    await assert.rejects(assignCombatantToCamp(combat, "inconnu", "pj"));
    await assert.rejects(assignCombatantToCamp(combat, "p1", "inconnu"));
  });
});
