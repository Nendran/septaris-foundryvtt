export type Phase = 1 | 2 | 3 | 4;

export type ConflictState = {
  currentPhase: Phase;
  currentCycle: number;
  priorityCamp: string;
  otherCamp: string;
};

export type NextPhaseResult = {
  nextPhase: Phase;
  nextCycle: number;
  activeCamp: string;
};

export type PrevPhaseResult = {
  prevPhase: Phase;
  prevCycle: number;
  activeCamp: string;
};

export type SeptarisResource = "major" | "minor" | "movement" | "reaction";

export type SeptarisResourcesAction = {
  major: number;
  minor: number;
  movement: number;
  reaction: number;
  lastRefreshCycle: number;
};

export type PhaseTimerState = {
  cycle: number;
  phase: Phase;
  remainingMs: number;
  startedAt: number | null;
};

export type PhaseTimerAction = "toggle" | "reset";
