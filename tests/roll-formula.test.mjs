import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildFormula } from "../scripts/foundry/rolls/roll-formula.js";
import { ROLL_MODES } from "../scripts/rules/resolution/types.js";

describe("Construction de la formule d20 pour Foundry", () => {
  for (const [mode, formula] of [
    [ROLL_MODES.NORMAL, "1d20"],
    [ROLL_MODES.ADVANTAGE, "2d20kh"],
    [ROLL_MODES.DISADVANTAGE, "2d20kl"],
  ]) {
    it(`${mode} sans bonus => ${formula}`, () => {
      assert.equal(buildFormula(mode, 0, 0, 0), formula);
    });
  }

  it("additionne narration, bonus divers et maîtrise", () => {
    assert.equal(buildFormula("normal", 2, 3, 4), "1d20+9");
  });

  it("prend en compte les modificateurs négatifs", () => {
    assert.equal(buildFormula("normal", 0, -2, -1), "1d20-3");
  });

  it("n'ajoute ni +0 ni -0 lorsque les bonus se compensent", () => {
    assert.equal(buildFormula("advantage", 2, -3, 1), "2d20kh");
  });

  it("applique le bonus même en désavantage", () => {
    assert.equal(buildFormula("disadvantage", 0, 1, 5), "2d20kl+6");
  });

  it("ne met pas le dé de Prouesse dans la formule du d20", () => {
    assert.equal(buildFormula("normal", 0, 0, 2), "1d20+2");
  });
});
