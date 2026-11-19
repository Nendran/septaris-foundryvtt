import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getResolutionDegree,
  resolveAction,
} from "../scripts/rules/resolution/resolution.js";

const boundaries = [
  [-50, "ExceptionalFailure"],
  [-17, "ExceptionalFailure"],
  [-16, "ExceptionalFailure"],
  [-15, "StrongFailure"],
  [-11, "StrongFailure"],
  [-10, "MediumFailure"],
  [-6, "MediumFailure"],
  [-5, "WeakFailure"],
  [-1, "WeakFailure"],
  [0, "Limit"],
  [1, "WeakSuccess"],
  [5, "WeakSuccess"],
  [6, "MediumSuccess"],
  [10, "MediumSuccess"],
  [11, "StrongSuccess"],
  [15, "StrongSuccess"],
  [16, "ExceptionalSuccess"],
  [50, "ExceptionalSuccess"],
];

describe("Résolution — marges et effets de Prouesse", () => {
  for (const [margin, expected] of boundaries) {
    it(`classe la marge ${margin} comme ${expected}`, () => {
      assert.equal(getResolutionDegree(margin), expected);
    });
  }

  it("une marge négative reste un échec sans Prouesse", () => {
    const r = resolveAction({ total: 9, target: 15, featSuccess: false });
    assert.deepEqual(
      {
        margin: r.margin,
        finalMargin: r.finalMargin,
        success: r.success,
        featEffect: r.featEffect,
      },
      { margin: -6, finalMargin: -6, success: false, featEffect: null },
    );
  });

  it("une Prouesse transforme un échec exceptionnel en réussite limite", () => {
    const r = resolveAction({ total: 4, target: 25, featSuccess: true });
    assert.equal(r.margin, -21);
    assert.equal(r.finalMargin, 0);
    assert.equal(r.outcome, "Limit");
    assert.equal(r.featEffect, "rescue");
    assert.equal(r.success, true);
  });

  it("une Prouesse double la marge de réussite et change le degré", () => {
    const r = resolveAction({ total: 15, target: 10, featSuccess: true });
    assert.equal(r.margin, 5);
    assert.equal(r.finalMargin, 10);
    assert.equal(r.outcome, "MediumSuccess");
    assert.equal(r.featEffect, "double");
  });

  it("un total égal à la difficulté réussit même sans Prouesse", () => {
    const r = resolveAction({ total: 10, target: 10, featSuccess: false });
    assert.equal(r.success, true);
    assert.equal(r.margin, 0);
    assert.equal(r.outcome, "Limit");
  });

  it("une Prouesse sur marge zéro garde la marge à zéro", () => {
    const r = resolveAction({ total: 10, target: 10, featSuccess: true });
    assert.equal(r.finalMargin, 0);
    assert.equal(r.featEffect, "double");
  });

  it("la marge de base ne change jamais après la Prouesse", () => {
    for (let margin = -25; margin <= 25; margin++) {
      const r = resolveAction({
        total: 10 + margin,
        target: 10,
        featSuccess: true,
      });
      assert.equal(r.margin, margin);
      assert.equal(r.finalMargin, margin < 0 ? 0 : margin * 2);
    }
  });

  it("le résultat est cohérent quel que soit le DD, à marge égale", () => {
    for (const target of [5, 10, 15, 20, 25]) {
      const r = resolveAction({
        total: target + 3,
        target,
        featSuccess: false,
      });
      assert.equal(r.margin, 3);
      assert.equal(r.outcome, "WeakSuccess");
    }
  });
});
