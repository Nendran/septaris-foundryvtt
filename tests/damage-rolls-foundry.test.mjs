import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Doubles Foundry minimaux, sur le modèle de attack-rolls-foundry.test.mjs.
// Chaque fichier node:test est isolé dans son propre processus.
const notifications = [];
const messages = [];
const rendered = [];
const dice = [];
const evaluated = [];
const remoteRequests = [];
const directUpdates = [];
let dialogResult;

globalThis.game = {
  user: { id: "damage-tester", targets: new Set() },
  i18n: { localize: (key) => key },
  settings: { get: () => "public" },
  users: {
    activeGM: {
      id: "gm-test",
      active: true,
      async query(queryName, request, options) {
        remoteRequests.push({ queryName, request, options });
        assert.equal(queryName, "septaris.applyDamage");
        const message = messages.find(
          (item) => item.uuid === request.messageUuid,
        );
        assert.ok(message, "Le message transmis au MJ doit exister");
        const targetActor = game.user.targets.values().next().value?.actor;
        assert.ok(targetActor, "Une attaque doit avoir un défenseur");
        const damage = rendered.at(-1).data.damage;
        targetActor.system.health.value = Math.max(
          0,
          targetActor.system.health.value - damage,
        );
        return {
          applied: damage > 0,
          alreadyApplied: false,
          damage,
          remainingHealth: targetActor.system.health.value,
        };
      },
    },
  },
};
globalThis.CONFIG = {
  ChatMessage: {
    modes: { public: { label: "Public" }, gmroll: { label: "GM" } },
  },
};
globalThis.ui = {
  notifications: {
    error(key) {
      notifications.push(key);
    },
    warn(key) {
      notifications.push(key);
    },
  },
};
globalThis.foundry = {
  abstract: { TypeDataModel: class {} },
  data: { fields: {} },
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: (Base) => Base,
    },
    handlebars: {
      async renderTemplate(path, data) {
        rendered.push({ path, data });
        return "<div>Carte simulée</div>";
      },
    },
  },
};
globalThis.CONST = { CHAT_MESSAGE_STYLES: { OTHER: 0 } };
globalThis.ChatMessage = {
  getSpeaker: ({ actor }) => ({ alias: actor.name }),
  applyMode(data, mode) {
    data._mode = mode;
  },
  async create(data) {
    const message = {
      ...data,
      uuid: `ChatMessage.test-${messages.length + 1}`,
    };
    messages.push(message);
    return message;
  },
};
globalThis.Roll = class MockRoll {
  constructor(formula, data) {
    this.formula = formula;
    this.data = data;
  }

  async evaluate() {
    if (dice.length === 0) {
      throw new Error(`Aucun résultat simulé pour ${this.formula}`);
    }
    this.total = dice.shift();
    evaluated.push(this);
    return this;
  }

  toJSON() {
    return { formula: this.formula, total: this.total };
  }
};

const { CharacterData } = await import("../scripts/data/actor/character.js");
const { NPCData } = await import("../scripts/data/actor/npc.js");
const { SeptarisRollDialog } = await import(
  "../scripts/sheets/dialogs/roll-dialog.js"
);
const { roll } = await import("../scripts/foundry/rolls/rolls.js");

SeptarisRollDialog.prototype.waitForResult = async () => dialogResult;

function options(overrides = {}) {
  return {
    characteristic: "strength",
    skill: "handtohand",
    narration: 0,
    bonus: 0,
    difficulty: 10,
    mode: "normal",
    messageMode: "public",
    ...overrides,
  };
}

function createCharacter(name = "PJ", weaponDamage = 0) {
  const system = new CharacterData();
  system.characteristics = {
    strength: 14,
    dexterity: 14,
    constitution: 12,
  };
  system.characteristicsModifiers = {
    strength: 2,
    dexterity: 2,
    constitution: 1,
  };
  system.skills = { handtohand: 2 };
  system.featDice = 10;
  system.health = { value: 15, max: 15 };
  Object.defineProperty(system, "weaponDamage", {
    get: () => weaponDamage,
    configurable: true,
  });
  const actor = {
    name,
    img: "pj.png",
    uuid: `Actor.${name}`,
    system,
    async update(data) {
      directUpdates.push({ actor: this, data });
      if ("system.health.value" in data) {
        this.system.health.value = data["system.health.value"];
      }
      return this;
    },
  };
  system.parent = actor;
  return { actor, system };
}

function createNPC(name = "PNJ", defense = 12, weaponDamage = 0) {
  const system = new NPCData();
  system.defense = defense;
  system.characteristicsModifiers = { strength: 1, dexterity: 0 };
  system.skills = { handtohand: 1 };
  system.health = { value: 10, max: 10 };
  Object.defineProperty(system, "weaponDamage", {
    get: () => weaponDamage,
    configurable: true,
  });
  const actor = {
    name,
    img: "pnj.png",
    uuid: `Actor.${name}`,
    system,
    async update(data) {
      directUpdates.push({ actor: this, data });
      if ("system.health.value" in data) {
        this.system.health.value = data["system.health.value"];
      }
      return this;
    },
  };
  system.parent = actor;
  return { actor, system };
}

function prepare({ targets = [], totals = [], response = options() } = {}) {
  game.user.targets = new Set(
    targets.map((actor) => ({
      actor,
      document: { uuid: `Scene.test.Token.${actor.name}` },
    })),
  );
  dice.splice(0, dice.length, ...totals);
  messages.length = 0;
  rendered.length = 0;
  evaluated.length = 0;
  notifications.length = 0;
  remoteRequests.length = 0;
  directUpdates.length = 0;
  dialogResult = response;
}

function card() {
  assert.equal(rendered.length, 1, "un seul rendu du chat attendu");
  assert.equal(messages.length, 1, "un seul message de chat attendu");
  return rendered[0].data;
}

describe("Étape 2.2 — dégâts dans les jets Foundry", () => {
  it("ajoute les dégâts d'arme à la marge d'une attaque réussie", async () => {
    const pj = createCharacter("Guerrier", 3);
    const enemy = createNPC("Cible", 12);
    prepare({ targets: [enemy.actor], totals: [16, 2] });
    await roll(pj.system, true, "attack");
    assert.equal(card().damage, 7);
    assert.equal(card().marginLabel, 4);
    assert.equal(card().finalMarginLabel, 4);
  });

  it("utilise la marge doublée par une prouesse et non la marge brute", async () => {
    const pj = createCharacter("Guerrier", 3);
    prepare({ targets: [createNPC("Cible", 12).actor], totals: [16, 10] });
    await roll(pj.system, true, "attack");
    assert.equal(card().marginLabel, 4);
    assert.equal(card().finalMarginLabel, 8);
    assert.equal(card().damage, 11);
    assert.equal(evaluated.length, 2);
  });

  it("une prouesse sauve un échec et conserve les dégâts fixes", async () => {
    const pj = createCharacter("Guerrier", 3);
    prepare({ targets: [createNPC("Cible", 12).actor], totals: [9, 10] });
    await roll(pj.system, true, "attack");
    assert.equal(card().marginLabel, -3);
    assert.equal(card().finalMarginLabel, 0);
    assert.equal(card().outcomeClass, "roll-card__outcome--success");
    assert.equal(card().damage, 3);
  });

  it("une attaque échouée ne produit aucun dégât malgré l'arme", async () => {
    const pj = createCharacter("Guerrier", 3);
    prepare({ targets: [createNPC("Cible", 12).actor], totals: [9, 2] });
    await roll(pj.system, true, "attack");
    assert.equal(card().outcomeClass, "roll-card__outcome--failure");
    assert.equal(card().damage, 0);
  });

  it("une réussite limite applique les dégâts fixes de l'arme", async () => {
    const pj = createCharacter("Guerrier", 3);
    prepare({ targets: [createNPC("Cible", 12).actor], totals: [12, 1] });
    await roll(pj.system, true, "attack");
    assert.equal(card().finalMarginLabel, 0);
    assert.equal(card().damage, 3);
  });

  it("une arme neutre laisse uniquement les dégâts de marge", async () => {
    const pj = createCharacter("Guerrier");
    prepare({ targets: [createNPC("Cible", 12).actor], totals: [16, 1] });
    await roll(pj.system, true, "attack");
    assert.equal(card().damage, 4);
  });

  it("un PNJ utilise ses dégâts fixes sans lancer de prouesse", async () => {
    const attacker = createNPC("Orque", 12, 4);
    const defender = createCharacter("Cible"); // Défense 8 + 2 + 1 = 11.
    prepare({ targets: [defender.actor], totals: [16] });
    await roll(attacker.system, false, "attack");
    assert.equal(card().difficulty, 11);
    assert.equal(card().damage, 9);
    assert.equal(evaluated.length, 1);
  });

  it("un jet générique ne calcule pas de dégâts même en cas de réussite", async () => {
    const pj = createCharacter("Guerrier", 4);
    prepare({ totals: [17], response: options({ difficulty: 12 }) });
    await roll(pj.system, false, "default");
    assert.equal(card().rollType, "default");
    assert.equal(card().damage, 0);
    assert.equal(notifications.length, 0);
    assert.equal(remoteRequests.length, 0);
    assert.equal(directUpdates.length, 0);
  });

  it("applique les dégâts exactement une fois par la requête au MJ", async () => {
    const pj = createCharacter("Guerrier", 3);
    const defender = createNPC("Cible", 12);
    prepare({ targets: [defender.actor], totals: [18, 2] });
    await roll(pj.system, true, "attack");
    assert.equal(card().damage, 9);
    assert.equal(defender.system.health.value, 1);
    assert.equal(remoteRequests.length, 1);
    assert.equal(
      directUpdates.length,
      0,
      "Pas de mise à jour directe côté joueur",
    );
    assert.equal(remoteRequests[0].request.messageUuid, messages[0].uuid);
    assert.equal(
      messages[0].flags.septaris.attack.targetTokenUuid,
      "Scene.test.Token.Cible",
    );
  });

  it("une attaque qui manque ne modifie pas les PV et n'envoie aucune requête", async () => {
    const pj = createCharacter("Guerrier", 3);
    const defender = createNPC("Cible", 12);
    prepare({ targets: [defender.actor], totals: [9, 2] });
    await roll(pj.system, true, "attack");
    assert.equal(card().damage, 0);
    assert.equal(defender.system.health.value, 10);
    assert.equal(remoteRequests.length, 0);
    assert.equal(directUpdates.length, 0);
  });

  it("une attaque avec zéro dégât n'envoie pas de requête", async () => {
    const pj = createCharacter("Guerrier", 0);
    const defender = createNPC("Cible", 12);
    prepare({ targets: [defender.actor], totals: [12, 1] });
    await roll(pj.system, true, "attack");
    assert.equal(card().damage, 0);
    assert.equal(defender.system.health.value, 10);
    assert.equal(remoteRequests.length, 0);
    assert.equal(directUpdates.length, 0);
  });
});
