import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Doubles minimaux de Foundry. Chaque fichier .test.mjs est isolé par node --test.
const notifications = [];
const chatMessages = [];
const renderedTemplates = [];
const evaluatedRolls = [];
const openedDialogs = [];
const queuedTotals = [];
const remoteRequests = [];
const directUpdates = [];
let dialogResult;

globalThis.game = {
  user: { id: "test-user", targets: new Set() },
  i18n: { localize: (key) => key },
  settings: { get: () => "public" },
  users: {
    activeGM: {
      id: "gm-test",
      active: true,
      async query(queryName, request, options) {
        remoteRequests.push({ queryName, request, options });
        const message = chatMessages.find(
          (item) => item.uuid === request.messageUuid,
        );
        assert.ok(message, "Le message transmis au MJ doit exister");
        assert.equal(queryName, "septaris.applyDamage");
        const targetActor = game.user.targets.values().next().value?.actor;
        assert.ok(targetActor, "Le MJ doit pouvoir retrouver le défenseur");
        const damage = renderedTemplates.at(-1).data.damage;
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
    error(key, options) {
      notifications.push({ key, options });
    },
    warn(key, options) {
      notifications.push({ key, options });
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
        renderedTemplates.push({ path, data });
        return "<div>Carte de jet simulée</div>";
      },
    },
  },
};

globalThis.CONST = { CHAT_MESSAGE_STYLES: { OTHER: 0 } };

globalThis.ChatMessage = {
  getSpeaker: ({ actor }) => ({ alias: actor.name }),
  applyMode(data, mode) {
    data._testMessageMode = mode;
  },
  async create(data) {
    const message = {
      ...data,
      uuid: `ChatMessage.test-${chatMessages.length + 1}`,
    };
    chatMessages.push(message);
    return message;
  },
};

globalThis.Roll = class MockRoll {
  constructor(formula, data) {
    this.formula = formula;
    this.data = data;
  }

  async evaluate() {
    if (queuedTotals.length === 0) {
      throw new Error(`Résultat de dé non simulé : ${this.formula}`);
    }
    this.total = queuedTotals.shift();
    evaluatedRolls.push(this);
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

SeptarisRollDialog.prototype.waitForResult = async function () {
  openedDialogs.push(this.rollConfig);
  return dialogResult;
};

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

function createPJ(name = "Aventurier", stats = {}) {
  const system = new CharacterData();
  system.characteristics = {
    strength: 14,
    dexterity: 16,
    constitution: 12,
    ...stats,
  };
  system.characteristicsModifiers = {
    strength: 2,
    dexterity: 3,
    constitution: 1,
  };
  system.skills = { handtohand: 2, addressing: 1 };
  system.featDice = 10;
  system.health = { value: 15, max: 15 };
  const actor = {
    name,
    img: `${name}.png`,
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

function createPNJ(name = "Gobelin", defense = 14) {
  const system = new NPCData();
  system.defense = defense;
  system.characteristicsModifiers = { strength: 1, dexterity: 0 };
  system.skills = { handtohand: 1, addressing: 1 };
  system.health = { value: 10, max: 10 };
  const actor = {
    name,
    img: `${name}.png`,
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

function target(actor) {
  return {
    id: `token-${actor?.name ?? "empty"}`,
    actor,
    document: { uuid: `Scene.test.Token.${actor?.name ?? "empty"}` },
  };
}

function prepare({ targets = [], totals = [], response = options() } = {}) {
  game.user.targets = new Set(targets);
  queuedTotals.splice(0, queuedTotals.length, ...totals);
  notifications.length = 0;
  chatMessages.length = 0;
  renderedTemplates.length = 0;
  evaluatedRolls.length = 0;
  openedDialogs.length = 0;
  remoteRequests.length = 0;
  directUpdates.length = 0;
  dialogResult = response;
}

function displayed() {
  assert.equal(renderedTemplates.length, 1);
  assert.equal(chatMessages.length, 1);
  return renderedTemplates[0].data;
}

describe("Étape 2.1 — validations des cibles Foundry", () => {
  it("refuse une attaque sans cible, sans ouvrir le dialogue ni lancer de dé", async () => {
    prepare();
    const result = await roll(createPJ().system, true, "attack");
    assert.equal(result, undefined);
    assert.equal(notifications[0].key, "SEPTARIS.Roll.NoTarget");
    assert.equal(openedDialogs.length, 0);
    assert.equal(evaluatedRolls.length, 0);
    assert.equal(chatMessages.length, 0);
  });

  it("refuse une attaque avec plusieurs cibles", async () => {
    prepare({
      targets: [target(createPNJ("A").actor), target(createPNJ("B").actor)],
    });
    await roll(createPJ().system, true, "attack");
    assert.equal(notifications[0].key, "SEPTARIS.Roll.TooManyTargets");
    assert.equal(openedDialogs.length, 0);
    assert.equal(chatMessages.length, 0);
  });

  for (const [label, actor] of [
    ["sans acteur", null],
    ["avec modèle étranger", { name: "Inconnu", system: {} }],
  ]) {
    it(`refuse une cible ${label}`, async () => {
      prepare({ targets: [target(actor)] });
      await roll(createPJ().system, true, "attack");
      assert.equal(notifications[0].key, "SEPTARIS.Roll.InvalidTargets");
      assert.equal(openedDialogs.length, 0);
      assert.equal(evaluatedRolls.length, 0);
      assert.equal(chatMessages.length, 0);
    });
  }

  it("une annulation ne crée aucun jet ni message", async () => {
    prepare({ targets: [target(createPNJ().actor)], response: null });
    const result = await roll(createPJ().system, true, "attack");
    assert.equal(result, undefined);
    assert.equal(openedDialogs.length, 1);
    assert.equal(evaluatedRolls.length, 0);
    assert.equal(chatMessages.length, 0);
  });
});

describe("Étape 2.1 — Défense, résultats et carte de chat", () => {
  it("utilise la Défense d'un PNJ et non le DD manuel", async () => {
    const gobelin = createPNJ("Gobelin", 17);
    prepare({ targets: [target(gobelin.actor)], totals: [15] });
    await roll(createPJ().system, false, "attack");
    const card = displayed();
    assert.equal(card.difficulty, 17);
    assert.equal(card.rollType, "attack");
    assert.equal(card.defender.name, "Gobelin");
    assert.equal(card.marginLabel, -2);
    assert.equal(card.outcomeClass, "roll-card__outcome--failure");
    assert.equal(chatMessages[0]._testMessageMode, "public");
  });

  it("utilise le getter Défense d'un PJ ciblé", async () => {
    const targetPJ = createPJ("Cible PJ", { dexterity: 14, constitution: 12 });
    // 8 + mod. DEX (+2) + mod. CON (+1) = 11.
    prepare({ targets: [target(targetPJ.actor)], totals: [11] });
    await roll(createPNJ("Attaquant PNJ").system, false, "attack");
    const card = displayed();
    assert.equal(card.difficulty, 11);
    assert.equal(card.marginLabel, 0);
    assert.equal(card.outcomeClass, "roll-card__outcome--success");
    assert.equal(card.defender.name, "Cible PJ");
  });

  it("la marge positive se classe en succès avec l'attaque normale", async () => {
    prepare({ targets: [target(createPNJ("Cible", 14).actor)], totals: [16] });
    await roll(createPJ().system, false, "attack");
    const card = displayed();
    assert.equal(card.marginLabel, 2);
    assert.equal(card.outcomeLabel, "SEPTARIS.Resolution.WeakSuccess");
  });

  it("le jet utilise le bonus caractéristique × maîtrise et les bonus optionnels", async () => {
    prepare({
      targets: [target(createPNJ().actor)],
      totals: [18],
      response: options({ mode: "advantage", narration: 1, bonus: -2 }),
    });
    await roll(createPJ().system, false, "attack");
    assert.equal(evaluatedRolls.length, 1);
    // Force +2, maîtrise 2 => +4 ; narration +1, divers -2 => +3.
    assert.equal(evaluatedRolls[0].formula, "2d20kh+3");
    assert.equal(displayed().modeLabel, "advantage");
  });

  it("une attaque réussie demande au MJ d'appliquer les dégâts une seule fois", async () => {
    const defender = createPNJ("Cible", 12);
    prepare({ targets: [target(defender.actor)], totals: [18] });
    await roll(createPJ().system, false, "attack");
    assert.equal(displayed().damage, 6);
    assert.equal(defender.system.health.value, 4);
    assert.equal(remoteRequests.length, 1);
    assert.equal(
      directUpdates.length,
      0,
      "Pas d'Actor.update depuis le client joueur",
    );
    assert.equal(chatMessages[0].flags.septaris.attack.kind, "attack");
    assert.equal(remoteRequests[0].request.messageUuid, chatMessages[0].uuid);
  });

  it("une attaque échouée laisse les PV intacts sans requête réseau", async () => {
    const defender = createPNJ("Cible", 12);
    prepare({ targets: [target(defender.actor)], totals: [10] });
    await roll(createPJ().system, false, "attack");
    assert.equal(displayed().damage, 0);
    assert.equal(defender.system.health.value, 10);
    assert.equal(remoteRequests.length, 0);
    assert.equal(directUpdates.length, 0);
  });
});

describe("Étape 2.1 — dés de Prouesse", () => {
  it("un PJ peut sauver une attaque ratée avec son dé de Prouesse", async () => {
    prepare({
      targets: [target(createPNJ("Cible", 16).actor)],
      totals: [9, 10],
    });
    await roll(createPJ().system, true, "attack");
    const card = displayed();
    assert.equal(evaluatedRolls.length, 2);
    assert.equal(evaluatedRolls[1].formula, "1d10");
    assert.equal(card.marginLabel, -7);
    assert.equal(card.finalMarginLabel, 0);
    assert.equal(card.outcomeLabel, "SEPTARIS.Resolution.Limit");
    assert.equal(card.outcomeClass, "roll-card__outcome--success");
    assert.equal(chatMessages[0].rolls.length, 2);
  });

  it("une Prouesse positive double la marge et change le degré", async () => {
    prepare({
      targets: [target(createPNJ("Cible", 14).actor)],
      totals: [18, 10],
    });
    await roll(createPJ().system, true, "attack");
    const card = displayed();
    assert.equal(card.marginLabel, 4);
    assert.equal(card.finalMarginLabel, 8);
    assert.equal(card.outcomeLabel, "SEPTARIS.Resolution.MediumSuccess");
  });

  it("un PNJ attaquant ne lance pas de Prouesse", async () => {
    prepare({ targets: [target(createPJ("Cible PJ").actor)], totals: [12] });
    await roll(createPNJ("Orque").system, false, "attack");
    assert.equal(openedDialogs[0].withFeatDie, false);
    assert.equal(evaluatedRolls.length, 1);
    assert.equal(displayed().featRoll, undefined);
    assert.equal(chatMessages[0].rolls.length, 1);
  });
});

describe("Étape 2.1 — non-régression du jet générique", () => {
  it("conserve le DD manuel et n'exige aucune cible", async () => {
    prepare({
      targets: [],
      totals: [15],
      response: options({ difficulty: 19 }),
    });
    await roll(createPJ().system, false, "default");
    const card = displayed();
    assert.equal(card.difficulty, 19);
    assert.equal(card.rollType, "default");
    assert.equal(card.defender, "");
    assert.equal(card.marginLabel, -4);
    assert.equal(notifications.length, 0);
    assert.equal(
      remoteRequests.length,
      0,
      "Aucun appel au MJ pour un test générique",
    );
    assert.equal(directUpdates.length, 0);
    assert.deepEqual(chatMessages[0].flags, {});
  });
});
