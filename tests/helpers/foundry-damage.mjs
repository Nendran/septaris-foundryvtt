/**
 * Doubles minimaux de Foundry VTT pour les tests réseau/dégâts Septaris.
 * Cette fixture doit être installée AVANT d'importer les modules compilés.
 * node --test isole chaque fichier .test.mjs dans son propre processus.
 */
import assert from "node:assert/strict";

export class MockUser {
  constructor(id, isGM = false) {
    this.id = id;
    this.isGM = isGM;
    this.active = true;
  }
}

export class MockActor {
  constructor(uuid, system, { owned = true, health = 10 } = {}) {
    this.uuid = uuid;
    this.name = uuid;
    this.system = system;
    this.system.parent = this;
    this.system.health = { value: health, max: health };
    this.owned = owned;
    this.updateCalls = [];
    this.flags = new Map();
    this.updateError = null;
  }

  testUserPermission(user, level) {
    assert.equal(level, "OWNER");
    return this.owned && Boolean(user?.id);
  }

  getFlag(scope, key) {
    return this.flags.get(`${scope}.${key}`);
  }

  async update(changes) {
    this.updateCalls.push(changes);
    if (this.updateError) throw this.updateError;
    if (Object.hasOwn(changes, "system.health.value")) {
      this.system.health.value = changes["system.health.value"];
    }
    if (Object.hasOwn(changes, "flags.septaris.appliedDamageAttacks")) {
      this.flags.set(
        "septaris.appliedDamageAttacks",
        structuredClone(changes["flags.septaris.appliedDamageAttacks"]),
      );
    }
    return this;
  }
}

export class MockTokenDocument {
  constructor(uuid, actor) {
    this.uuid = uuid;
    this.actor = actor;
  }
}

export class MockChatMessage {
  constructor(uuid, { author, attacker, target, rolls, metadata } = {}) {
    this.uuid = uuid;
    this.author = author;
    this.speakerActor = attacker;
    this.rolls = rolls ?? [{ total: 16 }];
    this.metadata = metadata ?? {
      kind: "attack",
      attackerUuid: attacker?.uuid,
      targetTokenUuid: target?.uuid,
    };
  }

  getFlag(scope, key) {
    if (scope === "septaris" && key === "attack") return this.metadata;
    return undefined;
  }
}

export function installDamageFoundry() {
  const documents = new Map();
  const gm = new MockUser("gm", true);
  const player = new MockUser("player", false);
  const stranger = new MockUser("stranger", false);
  const users = new Map([gm, player, stranger].map((user) => [user.id, user]));
  let documentIndex = 0;

  globalThis.foundry = {
    abstract: { TypeDataModel: class {} },
    data: { fields: {} },
    documents: {
      Actor: MockActor,
      ChatMessage: MockChatMessage,
      TokenDocument: MockTokenDocument,
      User: MockUser,
    },
    utils: {
      async fromUuid(uuid) {
        return documents.get(uuid) ?? null;
      },
    },
  };
  globalThis.game = {
    user: gm,
    users: {
      get: (id) => users.get(id),
      activeGM: gm,
    },
  };
  globalThis.CONFIG = { queries: {} };

  function add(document) {
    documents.set(document.uuid, document);
    return document;
  }

  function actor(Model, options = {}) {
    const system = new Model();
    // Défense d'un PJ : 8 + mod. DEX (+2) + mod. CON (+1) = 11.
    system.characteristics = { dexterity: 14, constitution: 12 };
    if (Model.name === "NPCData") system.defense = options.defense ?? 12;
    system.featDice = 10;
    Object.defineProperty(system, "weaponDamage", {
      get: () => options.weaponDamage ?? 3,
      configurable: true,
    });
    return add(new MockActor(`Actor.test${++documentIndex}`, system, options));
  }

  function token(defender, uuid = `Scene.test.Token.token${++documentIndex}`) {
    return add(new MockTokenDocument(uuid, defender));
  }

  function message({
    attacker,
    target,
    author = player,
    total = 16,
    feat = null,
    rolls,
    metadata,
  } = {}) {
    const serializedRolls = rolls ?? [
      JSON.stringify({ total }),
      ...(feat === null ? [] : [JSON.stringify({ total: feat })]),
    ];
    return add(
      new MockChatMessage(`ChatMessage.test${++documentIndex}`, {
        author,
        attacker,
        target,
        rolls: serializedRolls,
        metadata,
      }),
    );
  }

  return { gm, player, stranger, users, documents, actor, token, message };
}
