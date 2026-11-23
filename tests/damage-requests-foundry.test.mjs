import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { installDamageFoundry, MockUser } from "./helpers/foundry-damage.mjs";

const fixture = installDamageFoundry();
const { CharacterData } = await import("../scripts/data/actor/character.js");
const { NPCData } = await import("../scripts/data/actor/npc.js");
const { registerDamageRequests, requestDamageApplication } = await import(
  "../scripts/foundry/network/damage-requests.js"
);

const QUERY = "septaris.applyDamage";
const response = {
  applied: true,
  alreadyApplied: false,
  damage: 7,
  remainingHealth: 3,
};
const calls = [];

beforeEach(() => {
  game.user = fixture.player;
  game.users.activeGM = fixture.gm;
  fixture.gm.active = true;
  CONFIG.queries = {};
  calls.length = 0;
  fixture.gm.query = async (name, payload, options) => {
    calls.push({ name, payload, options });
    return response;
  };
});

function validAttack(author = fixture.player) {
  const attacker = fixture.actor(CharacterData, { weaponDamage: 3 });
  const defender = fixture.actor(NPCData, { defense: 12, health: 10 });
  const target = fixture.token(defender);
  const message = fixture.message({ attacker, target, author, total: 16 });
  return {
    attacker,
    defender,
    message,
    request: { messageUuid: message.uuid },
  };
}

async function withoutConsoleError(fn) {
  const original = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = original;
  }
}

describe("Étape 2.3 — émission des demandes de dégâts", () => {
  it("transmet au MJ actif le seul UUID et attend son résultat", async () => {
    const result = await requestDamageApplication("ChatMessage.example");
    assert.deepEqual(result, response);
    assert.deepEqual(calls, [
      {
        name: QUERY,
        payload: { messageUuid: "ChatMessage.example" },
        options: { timeout: 30_000 },
      },
    ]);
  });

  it("refuse un utilisateur courant manquant", async () => {
    game.user = null;
    await assert.rejects(
      requestDamageApplication("ChatMessage.example"),
      /Utilisateur introuvable/,
    );
    assert.equal(calls.length, 0);
  });

  it("refuse l'absence de MJ actif", async () => {
    game.users.activeGM = null;
    await assert.rejects(
      requestDamageApplication("ChatMessage.example"),
      /Aucun MJ actif/,
    );
  });

  it("refuse un MJ déconnecté", async () => {
    fixture.gm.active = false;
    await assert.rejects(
      requestDamageApplication("ChatMessage.example"),
      /Aucun MJ actif/,
    );
  });

  it("traite localement l'attaque du MJ actif", async () => {
    game.user = fixture.gm;
    const { message, defender } = validAttack(fixture.gm);
    const result = await requestDamageApplication(message.uuid);
    assert.equal(result.applied, true);
    assert.equal(result.damage, 7);
    assert.equal(defender.system.health.value, 3);
    assert.equal(defender.updateCalls.length, 1);
    assert.equal(calls.length, 0);
  });

  it("traite localement même sans MJ actif indiqué", async () => {
    game.user = fixture.gm;
    game.users.activeGM = null;
    const { message, defender } = validAttack(fixture.gm);
    const result = await requestDamageApplication(message.uuid);
    assert.equal(result.applied, true);
    assert.equal(defender.system.health.value, 3);
    assert.equal(calls.length, 0);
  });

  it("délègue à l'autre MJ actif", async () => {
    game.user = fixture.gm;
    const otherGM = new MockUser("gm-secondary", true);
    otherGM.query = async (name, payload, options) => {
      calls.push({ name, payload, options });
      return response;
    };
    game.users.activeGM = otherGM;
    const result = await requestDamageApplication("ChatMessage.deuxMJ");
    assert.deepEqual(result, response);
    assert.equal(calls.length, 1);
  });

  for (const badResponse of [
    null,
    {},
    { applied: "oui", remainingHealth: 3 },
    { applied: true },
  ]) {
    it(`rejette la réponse MJ : ${JSON.stringify(badResponse)}`, async () => {
      fixture.gm.query = async () => badResponse;
      await withoutConsoleError(async () => {
        await assert.rejects(
          requestDamageApplication("ChatMessage.example"),
          /Les dégâts n'ont pas pu être appliqués/,
        );
      });
    });
  }

  it("propage un refus réseau en conservant son origine", async () => {
    const originalError = new Error("Connexion coupée");
    fixture.gm.query = async () => {
      throw originalError;
    };
    await withoutConsoleError(async () => {
      await assert.rejects(
        requestDamageApplication("ChatMessage.example"),
        (error) => {
          assert.match(error.message, /Les dégâts n'ont pas pu être appliqués/);
          assert.equal(error.cause, originalError);
          return true;
        },
      );
    });
  });
});

describe("Étape 2.3 — enregistrement et réception côté MJ", () => {
  it("enregistre un gestionnaire nommé dans CONFIG.queries", () => {
    registerDamageRequests();
    assert.equal(typeof CONFIG.queries[QUERY], "function");
  });

  it("refuse un enregistrement en double", () => {
    registerDamageRequests();
    assert.throws(registerDamageRequests, /déjà enregistrée/);
  });

  it("refuse un traitement de requête sur une session joueur", async () => {
    registerDamageRequests();
    await assert.rejects(
      CONFIG.queries[QUERY](
        { messageUuid: "ChatMessage.a" },
        undefined,
        fixture.player,
      ),
      /hors session MJ/,
    );
  });

  it("refuse une requête dont le payload est mal formé", async () => {
    game.user = fixture.gm;
    registerDamageRequests();
    await assert.rejects(
      CONFIG.queries[QUERY](
        { mauvaisChamp: "ChatMessage.a" },
        undefined,
        fixture.player,
      ),
      /Demande de dégâts invalide/,
    );
  });

  it("refuse une requête dont l'émetteur est inconnu", async () => {
    game.user = fixture.gm;
    registerDamageRequests();
    const { request } = validAttack();
    await assert.rejects(
      CONFIG.queries[QUERY](request),
      /Impossible d'authentifier l'émetteur/,
    );
  });

  it("ignore l'identité prétendue dans le payload", async () => {
    game.user = fixture.gm;
    registerDamageRequests();
    const { request } = validAttack();
    await assert.rejects(
      CONFIG.queries[QUERY]({ ...request, userId: fixture.gm.id }),
      /Impossible d'authentifier l'émetteur/,
    );
  });

  it("traite l'objet User fourni par le transport", async () => {
    game.user = fixture.gm;
    registerDamageRequests();
    const { request, defender } = validAttack();
    const result = await CONFIG.queries[QUERY](
      request,
      undefined,
      fixture.player,
    );
    assert.equal(result.damage, 7);
    assert.equal(defender.system.health.value, 3);
  });

  it("retrouve l'émetteur depuis son identifiant", async () => {
    game.user = fixture.gm;
    registerDamageRequests();
    const { request, defender } = validAttack();
    const result = await CONFIG.queries[QUERY](
      request,
      undefined,
      fixture.player.id,
    );
    assert.equal(result.applied, true);
    assert.equal(defender.system.health.value, 3);
  });

  it("retrouve l'utilisateur depuis des métadonnées de contexte", async () => {
    game.user = fixture.gm;
    registerDamageRequests();
    const { request, defender } = validAttack();
    const result = await CONFIG.queries[QUERY](request, {
      userId: fixture.player.id,
    });
    assert.equal(result.applied, true);
    assert.equal(defender.system.health.value, 3);
  });

  it("refuse l'émetteur différent de l'auteur", async () => {
    game.user = fixture.gm;
    registerDamageRequests();
    const { request, defender } = validAttack();
    await assert.rejects(
      CONFIG.queries[QUERY](request, undefined, fixture.stranger),
      /Auteur de l'attaque invalide/,
    );
    assert.equal(defender.updateCalls.length, 0);
  });

  it("refuse un joueur non propriétaire de l'attaquant", async () => {
    game.user = fixture.gm;
    registerDamageRequests();
    const { request, attacker, defender } = validAttack();
    attacker.owned = false;
    await assert.rejects(
      CONFIG.queries[QUERY](request, undefined, fixture.player),
      /Attaquant non autorisé/,
    );
    assert.equal(defender.system.health.value, 10);
  });
});
