import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getActiveCamp,
  getNextCycle,
  getNextPhase,
  getPreviousCycle,
  getPreviousPhase,
  validateConflictState,
} from "../scripts/rules/conflit/phases.js";

const state = (
  currentCycle,
  currentPhase,
  priorityCamp = "pj",
  otherCamp = "pnj",
) => ({
  currentCycle,
  currentPhase,
  priorityCamp,
  otherCamp,
});

describe("Conflits — validation des données d'une phase", () => {
  it("accepte un état correct", () => {
    assert.doesNotThrow(() => validateConflictState(state(1, 1)));
    assert.doesNotThrow(() => validateConflictState(state(10, 4)));
  });

  for (const phase of [-1, 0, 1.5, 5, NaN, Infinity]) {
    it(`rejette une phase invalide : ${phase}`, () => {
      assert.throws(() => validateConflictState(state(1, phase)));
    });
  }

  for (const cycle of [-1, 0, 1.5, NaN, Infinity]) {
    it(`rejette un cycle invalide : ${cycle}`, () => {
      assert.throws(() => validateConflictState(state(cycle, 1)));
    });
  }

  it("rejette les camps vides et identiques", () => {
    assert.throws(() => validateConflictState(state(1, 1, "", "pnj")));
    assert.throws(() => validateConflictState(state(1, 1, "pj", " ")));
    assert.throws(() => validateConflictState(state(1, 1, "pj", "pj")));
  });
});

describe("Conflits — camps actifs et ordre des quatre phases", () => {
  it("alterne prioritaire / adverse / prioritaire / adverse", () => {
    assert.deepEqual(
      [1, 2, 3, 4].map((currentPhase) => getActiveCamp(state(2, currentPhase))),
      ["pj", "pnj", "pj", "pnj"],
    );
  });

  it("utilise aussi correctement le camp PNJ lorsqu'il est prioritaire", () => {
    assert.deepEqual(
      [1, 2, 3, 4].map((currentPhase) =>
        getActiveCamp(state(2, currentPhase, "pnj", "pj")),
      ),
      ["pnj", "pj", "pnj", "pj"],
    );
  });

  for (const [current, next, camp] of [
    [1, 2, "pnj"],
    [2, 3, "pj"],
    [3, 4, "pnj"],
    [4, 1, "pj"],
  ]) {
    it(`passe de la phase ${current} à ${next}`, () => {
      assert.deepEqual(getNextPhase(state(2, current)), {
        nextPhase: next,
        nextCycle: current === 4 ? 3 : 2,
        activeCamp: camp,
      });
    });
  }

  for (const [current, prev, cycle, camp] of [
    [1, 4, 1, "pnj"],
    [2, 1, 2, "pj"],
    [3, 2, 2, "pnj"],
    [4, 3, 2, "pj"],
  ]) {
    it(`revient de la phase ${current} à ${prev}`, () => {
      assert.deepEqual(getPreviousPhase(state(2, current)), {
        prevPhase: prev,
        prevCycle: cycle,
        activeCamp: camp,
      });
    });
  }

  it("refuse de reculer depuis cycle 1, phase 1", () => {
    assert.throws(() => getPreviousPhase(state(1, 1)));
  });

  it("aller puis revenir conserve le cycle et la phase (hors borne initiale)", () => {
    for (let cycle = 1; cycle <= 3; cycle++) {
      for (let phase = 1; phase <= 4; phase++) {
        const next = getNextPhase(state(cycle, phase));
        const back = getPreviousPhase(state(next.nextCycle, next.nextPhase));
        assert.equal(back.prevCycle, cycle);
        assert.equal(back.prevPhase, phase);
      }
    }
  });
});

describe("Conflits — transitions de cycles", () => {
  it("un nouveau cycle reprend à la phase 1", () => {
    assert.deepEqual(getNextCycle(state(3, 4)), {
      nextPhase: 1,
      nextCycle: 4,
      activeCamp: "pj",
    });
  });

  it("le cycle précédent retourne à sa phase 1", () => {
    assert.deepEqual(getPreviousCycle(state(3, 1)), {
      prevPhase: 1,
      prevCycle: 2,
      activeCamp: "pj",
    });
  });

  it("ne peut pas revenir au cycle 0", () => {
    assert.throws(() => getPreviousCycle(state(1, 1)));
  });
});
