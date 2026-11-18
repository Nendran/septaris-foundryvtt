import type { Phase, PhaseTimerState } from "./types.js";

export function createPhaseTimerState(
  cycle: number,
  phase: Phase,
  conflit: SeptarisCombat,
): PhaseTimerState {
  return {
    cycle,
    phase,
    remainingMs: conflit.combatants.size * 60 * 1000,
    startedAt: null,
  };
}

export function getRemainingTimeMs(
  state: PhaseTimerState,
  now: number = game.time.serverTime,
): number {
  if (state.startedAt === null) {
    return state.remainingMs;
  }

  const elapsed = Math.max(0, now - state.startedAt);

  return Math.max(0, state.remainingMs - elapsed);
}
