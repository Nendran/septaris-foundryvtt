import type { Phase, PhaseTimerState } from "./types";

export function createPhaseTimerState(
  cycle: number,
  phase: Phase,
  playerCount: number,
): PhaseTimerState {
  return {
    cycle,
    phase,
    remainingMs: (playerCount + 1) * 60_000,
    startedAt: null,
  };
}

export function getRemainingTimeMs(
  state: PhaseTimerState,
  now: number,
): number {
  if (state.startedAt === null) {
    return state.remainingMs;
  }

  return Math.max(0, state.remainingMs - Math.max(0, now - state.startedAt));
}
