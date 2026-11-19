import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateCharacteristicSkillBonus,
  formatModifier,
} from "../scripts/rules/resolution/modifiers.js";

describe("Bonus caractéristique × maîtrise (Novice/Adepte/Expert)", () => {
  const matrix = [
    // modificateur, novice, adepte, expert
    [-2, -2, -1, 0],
    [-1, -1, 0, 1],
    [0, 0, 1, 2],
    [1, 1, 2, 3],
    [2, 2, 4, 6],
    [5, 5, 10, 15],
  ];

  for (const [modifier, novice, adept, expert] of matrix) {
    for (const [rank, expected] of [
      [1, novice],
      [2, adept],
      [3, expert],
    ]) {
      it(`mod. ${modifier}, rang ${rank} => ${expected}`, () => {
        assert.equal(
          calculateCharacteristicSkillBonus(modifier, rank),
          expected,
        );
      });
    }
  }

  it("pour un bonus positif, Expert = 3 × modificateur", () => {
    for (let modifier = 1; modifier <= 5; modifier++) {
      assert.equal(
        calculateCharacteristicSkillBonus(modifier, 3),
        modifier * 3,
      );
    }
  });
});

describe("Formatage des bonus dans les formules de dés", () => {
  for (const [modifier, expected] of [
    [-12, "-12"],
    [-2, "-2"],
    [-1, "-1"],
    [0, ""],
    [1, "+1"],
    [3, "+3"],
    [15, "+15"],
  ]) {
    it(`${modifier} => ${JSON.stringify(expected)}`, () => {
      assert.equal(formatModifier(modifier), expected);
    });
  }
});
