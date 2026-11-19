import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { determinePriorityCamp } from "../scripts/rules/conflit/initiative.js";

const camps = [
  { id: "pj", name: "Joueurs", members: [{ id: "p1", name: "Personnage" }] },
  { id: "pnj", name: "Adversaires", members: [{ id: "n1", name: "Créature" }] },
];

const initiatives = (pj, pnj) => [
  { id: "pj", initiative: pj },
  { id: "pnj", initiative: pnj },
];

describe("Initiative des camps — meilleur résultat de chaque camp", () => {
  it("le camp joueur gagne lorsque son initiative est supérieure", () => {
    assert.equal(determinePriorityCamp(camps, "pj", initiatives(18, 12)), "pj");
  });

  it("le camp adverse gagne lorsque son initiative est supérieure", () => {
    assert.equal(determinePriorityCamp(camps, "pj", initiatives(8, 19)), "pnj");
  });

  it("en cas d'égalité, le camp des joueurs est prioritaire", () => {
    assert.equal(determinePriorityCamp(camps, "pj", initiatives(14, 14)), "pj");
  });

  it("l'égalité fonctionne même si le camp joueur est en seconde position", () => {
    assert.equal(
      determinePriorityCamp(
        [...camps].reverse(),
        "pj",
        initiatives(12, 12).reverse(),
      ),
      "pj",
    );
  });

  it("l'ordre de la liste d'initiatives ne change pas le gagnant", () => {
    assert.equal(
      determinePriorityCamp(camps, "pj", initiatives(5, 17).reverse()),
      "pnj",
    );
  });

  it("prend en compte les initiatives négatives", () => {
    assert.equal(
      determinePriorityCamp(camps, "pj", initiatives(-2, -1)),
      "pnj",
    );
  });

  it("refuse un camp joueur inconnu lors d'une égalité", () => {
    assert.throws(() =>
      determinePriorityCamp(camps, "inconnu", initiatives(14, 14)),
    );
  });

  // Validation complète des tableaux d'entrée à ajouter à determinePriorityCamp
  // si la fonction devient accessible à d'autres appelants que le flux Foundry validé.
});
