import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateDamage } from "../scripts/rules/conflit/damage.js";

describe("Étape 2.2 — calcul pur des dégâts", () => {
  it("utilise la marge finale positive avec une arme neutre", () => {
    assert.equal(calculateDamage(5, 0), 5);
  });

  it("préserve une réussite limite avec une arme neutre", () => {
    assert.equal(calculateDamage(0, 0), 0);
  });

  for (const [profile, fixed] of [
    ["légère", 2],
    ["standard", 3],
    ["lourde", 4],
  ]) {
    it(`ajoute les dégâts fixes d'une arme ${profile}`, () => {
      assert.equal(calculateDamage(4, fixed), 4 + fixed);
    });
  }

  it("conserve les dégâts fixes si la marge finale vaut zéro", () => {
    assert.equal(calculateDamage(0, 3), 3);
  });

  it("ajoute un bonus de dégâts indépendant", () => {
    assert.equal(calculateDamage(6, 3, 2), 11);
  });

  it("accepte un malus de dégâts", () => {
    assert.equal(calculateDamage(6, 3, -2), 7);
  });

  it("ne produit jamais de dégâts négatifs", () => {
    assert.equal(calculateDamage(0, 2, -5), 0);
  });

  it("applique zéro comme bonus par défaut", () => {
    assert.equal(calculateDamage(7, 3), calculateDamage(7, 3, 0));
  });
});
