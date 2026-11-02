import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getResolutionDegree,
  RESOLUTION_DEGREES,
  resolveAction,
} from "../scripts/utils/resolution.mjs";

describe("resolution degree boundaries", () => {
  const cases = [
    [-16, RESOLUTION_DEGREES.EXCEPTIONAL_FAILURE],
    [-15, RESOLUTION_DEGREES.STRONG_FAILURE],
    [-11, RESOLUTION_DEGREES.STRONG_FAILURE],
    [-10, RESOLUTION_DEGREES.MEDIUM_FAILURE],
    [-6, RESOLUTION_DEGREES.MEDIUM_FAILURE],
    [-5, RESOLUTION_DEGREES.WEAK_FAILURE],
    [-1, RESOLUTION_DEGREES.WEAK_FAILURE],
    [0, RESOLUTION_DEGREES.LIMIT],
    [1, RESOLUTION_DEGREES.WEAK_SUCCESS],
    [5, RESOLUTION_DEGREES.WEAK_SUCCESS],
    [6, RESOLUTION_DEGREES.MEDIUM_SUCCESS],
    [10, RESOLUTION_DEGREES.MEDIUM_SUCCESS],
    [11, RESOLUTION_DEGREES.STRONG_SUCCESS],
    [15, RESOLUTION_DEGREES.STRONG_SUCCESS],
    [16, RESOLUTION_DEGREES.EXCEPTIONAL_SUCCESS],
  ];

  for (const [margin, expected] of cases) {
    it(`${margin} => ${expected}`, () => {
      assert.equal(
        getResolutionDegree(margin),
        expected,
      );
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
      outcome: RESOLUTION_DEGREES.WEAK_FAILURE,
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
    assert.equal(
      result.outcome,
      RESOLUTION_DEGREES.WEAK_SUCCESS,
    );
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
    assert.equal(
      result.outcome,
      RESOLUTION_DEGREES.LIMIT,
    );
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
    assert.equal(
      result.outcome,
      RESOLUTION_DEGREES.MEDIUM_SUCCESS,
    );
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
    assert.equal(
      result.outcome,
      RESOLUTION_DEGREES.LIMIT,
    );
  });
});