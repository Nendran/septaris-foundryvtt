import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getPhaseTimerState,
  isPlayerPhase,
  updatePhaseTimer,
} from "../scripts/foundry/combat/phase-timer.js";
import { getRemainingTimeMs } from "../scripts/rules/conflit/timer.js";

// Chaque fichier de test est exécuté dans son propre processus avec node --test.
// Les valeurs de temps sont injectées, jamais obtenues depuis une vraie horloge.
globalThis.game = { user: { isGM: true }, time: { serverTime: 1_000 } };

function fakeCombat({
  players = 2,
  enemies = 3,
  phase = 1,
  priority = "pj",
  started = true,
} = {}) {
  const flags = new Map([
    ["septaris:currentPhase", phase],
    ["septaris:priorityCamp", priority],
    ["septaris:playerCampId", "pj"],
  ]);
  return {
    started,
    round: 1,
    writes: [],
    groups: {
      contents: [
        {
          id: "pj",
          name: "Joueurs",
          members: Array.from({ length: players }, (_, i) => ({
            id: `p${i}`,
            name: `PJ ${i}`,
          })),
        },
        {
          id: "pnj",
          name: "Adversaires",
          members: Array.from({ length: enemies }, (_, i) => ({
            id: `n${i}`,
            name: `PNJ ${i}`,
          })),
        },
      ],
    },
    getFlag(scope, key) {
      return flags.get(`${scope}:${key}`);
    },
    async setFlag(scope, key, value) {
      const copy = structuredClone(value);
      flags.set(`${scope}:${key}`, copy);
      this.writes.push({ scope, key, value: copy });
      return copy;
    },
  };
}

describe("Chronomètre Foundry — lecture et validation des flags", () => {
  it("retourne null en l'absence d'état enregistré", () => {
    assert.equal(getPhaseTimerState(fakeCombat()), null);
  });

  it("accepte un état complet correct", async () => {
    const combat = fakeCombat();
    const data = { cycle: 1, phase: 1, remainingMs: 180_000, startedAt: null };
    await combat.setFlag("septaris", "phaseTimer", data);
    assert.deepEqual(getPhaseTimerState(combat), data);
  });

  for (const invalid of [
    null,
    [],
    "invalid",
    {},
    { cycle: 0, phase: 1, remainingMs: 1_000, startedAt: null },
    { cycle: 1, phase: 5, remainingMs: 1_000, startedAt: null },
    { cycle: 1, phase: 1, remainingMs: -1, startedAt: null },
    { cycle: 1, phase: 1, remainingMs: Infinity, startedAt: null },
    { cycle: 1, phase: 1, remainingMs: 1_000 },
    { cycle: 1, phase: 1, remainingMs: 1_000, startedAt: "now" },
  ]) {
    it(`rejette un état mal formé : ${JSON.stringify(invalid)}`, async () => {
      const combat = fakeCombat();
      await combat.setFlag("septaris", "phaseTimer", invalid);
      assert.equal(getPhaseTimerState(combat), null);
    });
  }
});

describe("Chronomètre Foundry — éligibilité aux phases PJ", () => {
  it("est actif pour les phases 1 et 3 lorsque les PJ sont prioritaires", () => {
    assert.equal(isPlayerPhase(fakeCombat({ phase: 1 })), true);
    assert.equal(isPlayerPhase(fakeCombat({ phase: 2 })), false);
    assert.equal(isPlayerPhase(fakeCombat({ phase: 3 })), true);
    assert.equal(isPlayerPhase(fakeCombat({ phase: 4 })), false);
  });

  it("est actif pour les phases 2 et 4 si l'adversaire est prioritaire", () => {
    assert.equal(
      isPlayerPhase(fakeCombat({ phase: 1, priority: "pnj" })),
      false,
    );
    assert.equal(
      isPlayerPhase(fakeCombat({ phase: 2, priority: "pnj" })),
      true,
    );
    assert.equal(
      isPlayerPhase(fakeCombat({ phase: 4, priority: "pnj" })),
      true,
    );
  });

  it("refuse les conflits non démarrés et les phases invalides", () => {
    assert.equal(isPlayerPhase(fakeCombat({ started: false })), false);
    assert.equal(isPlayerPhase(fakeCombat({ phase: 9 })), false);
  });
});

describe("Chronomètre Foundry — démarrer, pause, reprise, reset", () => {
  const resetGame = () => {
    globalThis.game.user.isGM = true;
    globalThis.game.time.serverTime = 1_000;
  };

  it("calcule la durée à partir des PJ, pas du total PJ + PNJ", async () => {
    resetGame();
    const combat = fakeCombat({ players: 2, enemies: 5 });
    await updatePhaseTimer(combat, "reset");
    assert.equal(getPhaseTimerState(combat).remainingMs, 180_000);
  });

  it("démarre, se met en pause et reprend sans perdre le temps en pause", async () => {
    resetGame();
    const combat = fakeCombat({ players: 2, enemies: 3 });
    await updatePhaseTimer(combat, "toggle");
    assert.deepEqual(getPhaseTimerState(combat), {
      cycle: 1,
      phase: 1,
      remainingMs: 180_000,
      startedAt: 1_000,
    });

    globalThis.game.time.serverTime = 61_000;
    await updatePhaseTimer(combat, "toggle");
    assert.deepEqual(getPhaseTimerState(combat), {
      cycle: 1,
      phase: 1,
      remainingMs: 120_000,
      startedAt: null,
    });

    globalThis.game.time.serverTime = 999_000;
    assert.equal(
      getRemainingTimeMs(getPhaseTimerState(combat), game.time.serverTime),
      120_000,
    );
    await updatePhaseTimer(combat, "toggle");
    assert.equal(getPhaseTimerState(combat).startedAt, 999_000);
    assert.equal(getPhaseTimerState(combat).remainingMs, 120_000);

    globalThis.game.time.serverTime = 1_029_000;
    assert.equal(
      getRemainingTimeMs(getPhaseTimerState(combat), game.time.serverTime),
      90_000,
    );
  });

  it("réinitialise même après expiration avec la bonne durée", async () => {
    resetGame();
    const combat = fakeCombat({ players: 3, enemies: 10 });
    await updatePhaseTimer(combat, "toggle");
    game.time.serverTime = 1_000_000;
    const before = combat.writes.length;
    await updatePhaseTimer(combat, "toggle");
    assert.equal(combat.writes.length, before + 1); // pause avec 0 restant
    assert.equal(getPhaseTimerState(combat).remainingMs, 0);
    const atZero = combat.writes.length;
    await updatePhaseTimer(combat, "toggle");
    assert.equal(combat.writes.length, atZero); // ne redémarre pas à zéro
    await updatePhaseTimer(combat, "reset");
    assert.equal(getPhaseTimerState(combat).remainingMs, 240_000);
    assert.equal(getPhaseTimerState(combat).startedAt, null);
  });

  it("refuse un utilisateur non MJ", async () => {
    resetGame();
    const combat = fakeCombat();
    game.user.isGM = false;
    try {
      await assert.rejects(updatePhaseTimer(combat, "toggle"));
      assert.equal(combat.writes.length, 0);
    } finally {
      game.user.isGM = true;
    }
  });

  it("refuse une phase adverse", async () => {
    resetGame();
    const combat = fakeCombat({ phase: 2, priority: "pj" });
    await assert.rejects(updatePhaseTimer(combat, "toggle"));
    assert.equal(combat.writes.length, 0);
  });
});
