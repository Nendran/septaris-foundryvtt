import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { installDamageFoundry } from "./helpers/foundry-damage.mjs";

const fixture = installDamageFoundry();
const { CharacterData } = await import("../scripts/data/actor/character.js");
const { NPCData } = await import("../scripts/data/actor/npc.js");
const { applyDamageFromAttack } = await import(
  "../scripts/foundry/combat/damage-application.js"
);

beforeEach(() => {
  game.user = fixture.gm;
});

function scenario({
  attackerModel = CharacterData,
  defenderModel = NPCData,
  weaponDamage = 3,
  health = 10,
  defense = 12,
  total = 16,
  feat = null,
  author = fixture.player,
  owned = true,
} = {}) {
  const attacker = fixture.actor(attackerModel, { weaponDamage, owned });
  const defender = fixture.actor(defenderModel, { health, defense });
  const target = fixture.token(defender);
  const message = fixture.message({ attacker, target, total, feat, author });
  return {
    attacker,
    defender,
    target,
    message,
    request: { messageUuid: message.uuid },
  };
}

describe("Étape 2.3 — application autorisée des dégâts", () => {
  it("recalcule les dégâts et persiste PV + historique", async () => {
    const { request, defender, message } = scenario();
    const result = await applyDamageFromAttack(request, fixture.player);
    assert.deepEqual(result, {
      applied: true,
      alreadyApplied: false,
      damage: 7,
      remainingHealth: 3,
    });
    assert.equal(defender.system.health.value, 3);
    assert.equal(defender.updateCalls.length, 1);
    assert.deepEqual(defender.updateCalls[0], {
      "system.health.value": 3,
      "flags.septaris.appliedDamageAttacks": [message.uuid],
    });
  });

  it("clamp les PV à zéro sans dégâts négatifs", async () => {
    const { request, defender } = scenario({ health: 4 });
    const result = await applyDamageFromAttack(request, fixture.player);
    assert.equal(result.damage, 7);
    assert.equal(result.remainingHealth, 0);
    assert.equal(defender.system.health.value, 0);
  });

  it("double la marge positive pour une Prouesse PJ", async () => {
    const { request, defender } = scenario({ health: 20, feat: 10 });
    const result = await applyDamageFromAttack(request, fixture.player);
    assert.equal(result.damage, 11);
    assert.equal(defender.system.health.value, 9);
  });

  it("transforme un échec en réussite limite grâce à une Prouesse", async () => {
    const { request, defender } = scenario({ total: 9, feat: 10 });
    const result = await applyDamageFromAttack(request, fixture.player);
    assert.equal(result.damage, 3);
    assert.equal(defender.system.health.value, 7);
  });

  it("n'applique rien si l'attaque échoue sans Prouesse", async () => {
    const { request, defender } = scenario({ total: 8 });
    const result = await applyDamageFromAttack(request, fixture.player);
    assert.deepEqual(result, {
      applied: false,
      alreadyApplied: false,
      damage: 0,
      remainingHealth: 10,
    });
    assert.equal(defender.updateCalls.length, 0);
  });

  it("n'applique rien sur une réussite limite sans dégâts fixes", async () => {
    const { request, defender } = scenario({ total: 12, weaponDamage: 0 });
    const result = await applyDamageFromAttack(request, fixture.player);
    assert.equal(result.damage, 0);
    assert.equal(result.applied, false);
    assert.equal(defender.updateCalls.length, 0);
  });

  it("autorise un PNJ à attaquer un PJ avec sa Défense calculée", async () => {
    const { request, defender } = scenario({
      attackerModel: NPCData,
      defenderModel: CharacterData,
      health: 15,
      total: 16,
      author: fixture.gm,
    });
    const result = await applyDamageFromAttack(request, fixture.gm);
    // Défense PJ = 8 + 2 DEX + 1 CON = 11 ; marge 5 + arme 3.
    assert.equal(result.damage, 8);
    assert.equal(defender.system.health.value, 7);
  });

  it("n'attribue pas de Prouesse à un attaquant PNJ", async () => {
    const { request } = scenario({
      attackerModel: NPCData,
      total: 16,
      feat: 10,
      author: fixture.gm,
    });
    const result = await applyDamageFromAttack(request, fixture.gm);
    assert.equal(result.damage, 7);
  });

  it("ne réapplique jamais deux fois le même message", async () => {
    const { request, defender } = scenario();
    await applyDamageFromAttack(request, fixture.player);
    const repeated = await applyDamageFromAttack(request, fixture.player);
    assert.deepEqual(repeated, {
      applied: false,
      alreadyApplied: true,
      damage: 0,
      remainingHealth: 3,
    });
    assert.equal(defender.updateCalls.length, 1);
  });

  it("sérialise deux demandes simultanées portant sur la même attaque", async () => {
    const { request, defender } = scenario();
    const results = await Promise.all([
      applyDamageFromAttack(request, fixture.player),
      applyDamageFromAttack(request, fixture.player),
    ]);
    assert.equal(results.filter((item) => item.applied).length, 1);
    assert.equal(results.filter((item) => item.alreadyApplied).length, 1);
    assert.equal(defender.updateCalls.length, 1);
    assert.equal(defender.system.health.value, 3);
  });

  it("déduit deux attaques distinctes à partir des PV actualisés", async () => {
    const { attacker, defender, target, request } = scenario({ health: 20 });
    const second = fixture.message({ attacker, target, total: 16 });
    const results = await Promise.all([
      applyDamageFromAttack(request, fixture.player),
      applyDamageFromAttack({ messageUuid: second.uuid }, fixture.player),
    ]);
    assert.deepEqual(
      results.map((result) => result.remainingHealth),
      [13, 6],
    );
    assert.equal(defender.updateCalls.length, 2);
    assert.equal(defender.system.health.value, 6);
  });

  it("modifie uniquement l'acteur synthétique du token ciblé", async () => {
    const attacker = fixture.actor(CharacterData);
    const base = fixture.actor(NPCData, { health: 10 });
    const syntheticA = fixture.actor(NPCData, { health: 10 });
    const syntheticB = fixture.actor(NPCData, { health: 10 });
    const tokenA = fixture.token(syntheticA);
    fixture.token(syntheticB);
    const message = fixture.message({ attacker, target: tokenA });
    const result = await applyDamageFromAttack(
      { messageUuid: message.uuid },
      fixture.player,
    );
    assert.equal(result.remainingHealth, 3);
    assert.equal(syntheticA.system.health.value, 3);
    assert.equal(syntheticB.system.health.value, 10);
    assert.equal(base.system.health.value, 10);
    assert.equal(base.updateCalls.length, 0);
  });

  it("limite l'historique conservé aux 100 derniers identifiants", async () => {
    const { request, defender } = scenario();
    defender.flags.set(
      "septaris.appliedDamageAttacks",
      Array.from({ length: 100 }, (_, i) => `ChatMessage.old${i}`),
    );
    await applyDamageFromAttack(request, fixture.player);
    const history = defender.getFlag("septaris", "appliedDamageAttacks");
    assert.equal(history.length, 100);
    assert.equal(history[0], "ChatMessage.old1");
    assert.equal(history.at(-1), request.messageUuid);
  });
});

describe("Étape 2.3 — validations et permissions côté MJ", () => {
  it("refuse toute exécution sur une session non MJ", async () => {
    const { request } = scenario();
    game.user = fixture.player;
    await assert.rejects(
      applyDamageFromAttack(request, fixture.player),
      /réservée au MJ/,
    );
  });

  it("refuse les demandes sans émetteur authentifié", async () => {
    const { request } = scenario();
    await assert.rejects(
      applyDamageFromAttack(request, null),
      /Émetteur non identifié/,
    );
  });

  for (const uuid of [null, "Actor.fake", "", 42]) {
    it(`rejette une référence de message invalide : ${String(uuid)}`, async () => {
      await assert.rejects(
        applyDamageFromAttack({ messageUuid: uuid }, fixture.player),
        /Référence d'attaque invalide/,
      );
    });
  }

  it("refuse un message inexistant", async () => {
    await assert.rejects(
      applyDamageFromAttack(
        { messageUuid: "ChatMessage.introuvable" },
        fixture.player,
      ),
      /Message d'attaque introuvable/,
    );
  });

  it("refuse une requête d'un utilisateur différent de l'auteur du jet", async () => {
    const { request } = scenario();
    await assert.rejects(
      applyDamageFromAttack(request, fixture.stranger),
      /Auteur de l'attaque invalide/,
    );
  });

  it("refuse les métadonnées incomplètes", async () => {
    const { request, message } = scenario();
    message.metadata = { kind: "attack", attackerUuid: "Actor.incomplet" };
    await assert.rejects(
      applyDamageFromAttack(request, fixture.player),
      /Métadonnées d'attaque invalides/,
    );
  });

  it("refuse une cible inexistante", async () => {
    const { request, message } = scenario();
    message.metadata.targetTokenUuid = "Scene.test.Token.unknown";
    await assert.rejects(
      applyDamageFromAttack(request, fixture.player),
      /Token ciblé introuvable/,
    );
  });

  it("refuse les modèles d'attaquant non Septaris", async () => {
    const { request, attacker } = scenario();
    attacker.system = {};
    await assert.rejects(
      applyDamageFromAttack(request, fixture.player),
      /Modèle d'attaquant invalide/,
    );
  });

  it("refuse les modèles de défenseur non Septaris", async () => {
    const { request, defender } = scenario();
    defender.system = {};
    await assert.rejects(
      applyDamageFromAttack(request, fixture.player),
      /Modèle de défenseur invalide/,
    );
  });

  it("refuse un joueur non propriétaire de l'attaquant", async () => {
    const { request, defender } = scenario({ owned: false });
    await assert.rejects(
      applyDamageFromAttack(request, fixture.player),
      /Attaquant non autorisé/,
    );
    assert.equal(defender.updateCalls.length, 0);
  });

  it("autorise le MJ à attaquer même sans propriété de l'acteur", async () => {
    const { request } = scenario({ owned: false, author: fixture.gm });
    const result = await applyDamageFromAttack(request, fixture.gm);
    assert.equal(result.applied, true);
  });

  it("refuse un acteur annoncé différent de l'auteur de l'attaque", async () => {
    const { request, message } = scenario();
    message.speakerActor = fixture.actor(CharacterData);
    await assert.rejects(
      applyDamageFromAttack(request, fixture.player),
      /Attaquant différent du jet enregistré/,
    );
  });

  it("refuse un message sans jet", async () => {
    const { request, message } = scenario();
    message.rolls = [];
    await assert.rejects(
      applyDamageFromAttack(request, fixture.player),
      /Aucun jet d'attaque enregistré/,
    );
  });

  for (const rolls of [
    [{ total: "16" }],
    [{ total: Infinity }],
    ["{json invalide"],
  ]) {
    it(`refuse un jet corrompu : ${JSON.stringify(rolls)}`, async () => {
      const { request, message } = scenario();
      message.rolls = rolls;
      await assert.rejects(applyDamageFromAttack(request, fixture.player));
    });
  }

  it("ne touche pas aux PV si Actor.update échoue", async () => {
    const { request, defender } = scenario();
    defender.updateError = new Error("Échec de stockage");
    await assert.rejects(
      applyDamageFromAttack(request, fixture.player),
      /Échec de stockage/,
    );
    assert.equal(defender.system.health.value, 10);
    assert.equal(
      defender.getFlag("septaris", "appliedDamageAttacks"),
      undefined,
    );
  });

  it("refuse un faux Actor sur la cible", async () => {
    const { request, target } = scenario();
    target.actor = { uuid: "Actor.faux", system: { health: { value: 10 } } };
    await assert.rejects(
      applyDamageFromAttack(request, fixture.player),
      /Défenseur introuvable/,
    );
  });
});
