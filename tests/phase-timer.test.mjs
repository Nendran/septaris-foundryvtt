import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPhaseTimerState,
  getRemainingTimeMs,
} from "../scripts/rules/conflit/timer.js";

describe("Chronomètre — durée = (nombre de PJ + 1) minutes", () => {
  for (const [players, duration] of [
    [1, 120_000],
    [2, 180_000],
    [3, 240_000],
    [4, 300_000],
    [6, 420_000],
  ]) {
    it(`${players} PJ => ${duration / 60_000} minutes`, () => {
      assert.deepEqual(createPhaseTimerState(2, 3, players), {
        cycle: 2,
        phase: 3,
        remainingMs: duration,
        startedAt: null,
      });
    });
  }

  it("deux appels renvoient deux états indépendants", () => {
    assert.notStrictEqual(
      createPhaseTimerState(1, 1, 2),
      createPhaseTimerState(1, 1, 2),
    );
  });
});

describe("Chronomètre — temps restant", () => {
  const base = () => createPhaseTimerState(1, 1, 2);

  it("ne décrémente pas un chronomètre non démarré", () => {
    assert.equal(getRemainingTimeMs(base(), 500_000), 180_000);
  });

  it("décrémente le temps quand le chronomètre tourne", () => {
    assert.equal(
      getRemainingTimeMs({ ...base(), startedAt: 1_000 }, 61_000),
      120_000,
    );
  });

  it("retourne zéro exactement à l'expiration", () => {
    assert.equal(
      getRemainingTimeMs({ ...base(), startedAt: 1_000 }, 181_000),
      0,
    );
  });

  it("ne retourne jamais une durée négative", () => {
    assert.equal(
      getRemainingTimeMs({ ...base(), startedAt: 1_000 }, 999_999),
      0,
    );
  });

  it("ignore un horodatage courant antérieur au démarrage", () => {
    assert.equal(
      getRemainingTimeMs({ ...base(), startedAt: 10_000 }, 9_000),
      180_000,
    );
  });

  it("ne modifie pas l'objet reçu", () => {
    const state = { ...base(), startedAt: 1_000 };
    const before = structuredClone(state);
    getRemainingTimeMs(state, 12_000);
    assert.deepEqual(state, before);
  });
});
