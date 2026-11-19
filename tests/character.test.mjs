import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateCharacteristicModifier,
  calculateCharacteristicModifiers,
} from "../scripts/rules/character/characteristics.js";
import { calculateDefense } from "../scripts/rules/character/defense.js";
import { calculateMaxHealth } from "../scripts/rules/character/health.js";
import { calculateNextSkillProficiency } from "../scripts/rules/character/skill.js";

describe("Caractéristiques — barème Septaris", () => {
  const expected = new Map([
    [6, -2],
    [7, -2],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [13, 1],
    [14, 2],
    [15, 2],
    [16, 3],
    [17, 3],
    [18, 4],
    [19, 4],
    [20, 5],
  ]);

  for (const [value, modifier] of expected) {
    it(`caractéristique ${value} donne ${modifier}`, () => {
      assert.equal(calculateCharacteristicModifier(value), modifier);
    });
  }

  it("calcule les six modificateurs dans le bon ordre", () => {
    const result = calculateCharacteristicModifiers(6, 9, 10, 13, 16, 20);
    assert.deepEqual(result, {
      strength: -2,
      dexterity: -1,
      constitution: 0,
      intelligence: 1,
      instinct: 3,
      charisma: 5,
    });
  });

  it("retourne un nouvel objet à chaque appel", () => {
    const first = calculateCharacteristicModifiers(10, 10, 10, 10, 10, 10);
    const second = calculateCharacteristicModifiers(10, 10, 10, 10, 10, 10);
    assert.notStrictEqual(first, second);
  });
});

describe("PV maximum — 15 + modificateur de Constitution", () => {
  for (const [constitution, expected] of [
    [6, 13],
    [9, 14],
    [10, 15],
    [11, 15],
    [12, 16],
    [17, 18],
    [20, 20],
  ]) {
    it(`Constitution ${constitution} donne ${expected} PV`, () => {
      assert.equal(calculateMaxHealth(constitution), expected);
    });
  }
});

describe("Défense sans équipement — 8 + mod. DEX + mod. CON", () => {
  for (const [dexterity, constitution, expected] of [
    [10, 10, 8],
    [6, 6, 4],
    [20, 20, 18],
    [12, 14, 11],
    [9, 11, 7],
    [11, 9, 7],
    [18, 6, 10],
  ]) {
    it(`DEX ${dexterity} / CON ${constitution} => ${expected}`, () => {
      assert.equal(calculateDefense(dexterity, constitution), expected);
    });
  }
});

describe("Changement manuel du rang sur la fiche", () => {
  // Ce cycle décrit le bouton de fiche, PAS les coûts en PE de progression.
  for (const [current, next] of [
    [1, 2],
    [2, 3],
    [3, 1],
  ]) {
    it(`rang ${current} vers ${next}`, () => {
      assert.equal(calculateNextSkillProficiency(current), next);
    });
  }
});
