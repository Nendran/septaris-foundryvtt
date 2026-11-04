import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getResolutionDegree,
  resolveAction,
} from "../scripts/utils/resolution.js";

describe("resolution degree boundaries", () => {
  const cases = [
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
  ];

  for (const [margin, expected] of cases) {
    it(`${margin} => ${expected}`, () => {
      assert.equal(getResolutionDegree(margin), expected);
    });
  }
});

describe("resolveAction", () => {
  it("keeps a failed margin when there is no feat", () => {
    const result = resolveAction({
      total: 7,
      target: 10,
      featSuccess: false,
    });

    assert.deepEqual(result, {
      total: 7,
      target: 10,
      margin: -3,
      finalMargin: -3,
      success: false,
      featSuccess: false,
      featEffect: null,
      outcome: "WeakFailure",
    });
  });

  it("keeps a successful margin when there is no feat", () => {
    const result = resolveAction({
      total: 13,
      target: 10,
      featSuccess: false,
    });

    assert.equal(result.margin, 3);
    assert.equal(result.finalMargin, 3);
    assert.equal(result.success, true);
    assert.equal(result.outcome, "WeakSuccess");
  });

  it("turns a failure into a limit success when feat succeeds", () => {
    const result = resolveAction({
      total: 7,
      target: 10,
      featSuccess: true,
    });

    assert.equal(result.margin, -3);
    assert.equal(result.finalMargin, 0);
    assert.equal(result.success, true);
    assert.equal(result.featEffect, "rescue");
    assert.equal(result.outcome, "Limit");
  });

  it("doubles a successful margin when feat succeeds", () => {
    const result = resolveAction({
      total: 13,
      target: 10,
      featSuccess: true,
    });

    assert.equal(result.margin, 3);
    assert.equal(result.finalMargin, 6);
    assert.equal(result.success, true);
    assert.equal(result.featEffect, "double");
    assert.equal(result.outcome, "MediumSuccess");
  });

  it("keeps margin 0 at 0 when feat succeeds", () => {
    const result = resolveAction({
      total: 10,
      target: 10,
      featSuccess: true,
    });

    assert.equal(result.margin, 0);
    assert.equal(result.finalMargin, 0);
    assert.equal(result.success, true);
    assert.equal(result.featEffect, "double");
    assert.equal(result.outcome, "Limit");
  });
});
