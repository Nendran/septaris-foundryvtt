import {
  CURRENT_PHASE_FLAG,
  getActiveCamp,
  type Phase,
  PRIORITY_CAMP_FLAG,
  SCOPE_FLAG,
} from "./conflict.js";

import { getConflictCamps, getPlayerCampId } from "./conflict-groups.js";

export const PHASE_TIMER_FLAG = "phaseTimer";
export const PHASE_TIMER_DURATION_MS = 6 * 60 * 1000;

export type PhaseTimerState = {
  cycle: number;
  phase: Phase;
  remainingMs: number;
  startedAt: number | null;
};

export type PhaseTimerAction = "toggle" | "reset";

export function createPhaseTimerState(
  cycle: number,
  phase: Phase,
): PhaseTimerState {
  return {
    cycle,
    phase,
    remainingMs: PHASE_TIMER_DURATION_MS,
    startedAt: null,
  };
}

export function getPhaseTimerState(
  combat: SeptarisCombat,
): PhaseTimerState | null {
  const value: unknown = combat.getFlag(SCOPE_FLAG, PHASE_TIMER_FLAG);

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const state = value as Record<string, unknown>;

  if (
    !Number.isInteger(state.cycle) ||
    Number(state.cycle) < 1 ||
    !Number.isInteger(state.phase) ||
    Number(state.phase) < 1 ||
    Number(state.phase) > 4 ||
    typeof state.remainingMs !== "number" ||
    !Number.isFinite(state.remainingMs) ||
    state.remainingMs < 0 ||
    (state.startedAt !== null &&
      (typeof state.startedAt !== "number" ||
        !Number.isFinite(state.startedAt)))
  ) {
    return null;
  }

  return state as PhaseTimerState;
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

export function isPlayerPhase(combat: SeptarisCombat): boolean {
  if (!combat.started) return false;

  const phase = combat.getFlag(SCOPE_FLAG, CURRENT_PHASE_FLAG);

  const priorityCamp = combat.getFlag(SCOPE_FLAG, PRIORITY_CAMP_FLAG);

  const playerCampId = getPlayerCampId(combat);

  if (
    typeof phase !== "number" ||
    !Number.isInteger(phase) ||
    phase < 1 ||
    phase > 4 ||
    typeof priorityCamp !== "string" ||
    !playerCampId
  ) {
    return false;
  }

  const camps = getConflictCamps(combat);

  if (camps.length !== 2 || !camps.some((camp) => camp.id === priorityCamp)) {
    return false;
  }

  const otherCamp = camps.find((camp) => camp.id !== priorityCamp);

  if (!otherCamp) return false;

  return (
    getActiveCamp({
      currentPhase: phase as Phase,
      priorityCamp,
      otherCamp: otherCamp.id,
    }) === playerCampId
  );
}

export async function updatePhaseTimer(
  combat: SeptarisCombat,
  action: PhaseTimerAction,
): Promise<void> {
  if (!game.user?.isGM) {
    throw new Error("SEPTARIS | Only the GM can control the phase timer.");
  }

  if (!isPlayerPhase(combat)) {
    throw new Error("SEPTARIS | Timer is only available during player phases.");
  }

  const cycle = combat.round;

  const phase = combat.getFlag(SCOPE_FLAG, CURRENT_PHASE_FLAG) as Phase;

  const storedState = getPhaseTimerState(combat);

  const state =
    storedState?.cycle === cycle && storedState.phase === phase
      ? storedState
      : createPhaseTimerState(cycle, phase);

  const now = game.time.serverTime;

  const remainingMs = getRemainingTimeMs(state, now);

  let nextState: PhaseTimerState;

  if (action === "reset") {
    nextState = createPhaseTimerState(cycle, phase);
  } else if (state.startedAt !== null) {
    // Pause : on conserve le temps réellement restant.
    nextState = {
      ...state,
      remainingMs,
      startedAt: null,
    };
  } else {
    // Démarrage ou reprise.
    // À 00:00, une réinitialisation est nécessaire.
    if (remainingMs <= 0) return;

    nextState = {
      ...state,
      remainingMs,
      startedAt: now,
    };
  }

  await combat.setFlag(SCOPE_FLAG, PHASE_TIMER_FLAG, nextState);
}
