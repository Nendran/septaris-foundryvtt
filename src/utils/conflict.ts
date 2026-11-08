export type Phase = 1 | 2 | 3 | 4;

export const SCOPE_FLAG = "septaris";
export const CURRENT_PHASE_FLAG = "currentPhase";
export const PRIORITY_CAMP_FLAG = "priorityCamp";
export const PLAYER_CAMP_ID_FLAG = "playerCampId";

export type ConflictState = {
  currentPhase: Phase;
  currentCycle: number;
  priorityCamp: string;
  otherCamp: string;
};

type NextPhaseResult = {
  nextPhase: Phase;
  nextCycle: number;
  activeCamp: string;
};

type PrevPhaseResult = {
  prevPhase: Phase;
  prevCycle: number;
  activeCamp: string;
};

export function validateConflictState(options: ConflictState): void {
  if (
    options.currentPhase < 1 ||
    options.currentPhase > 4 ||
    !Number.isInteger(options.currentPhase)
  ) {
    throw new Error(
      "SEPTARIS | Invalid current phase. Must be between 1 and 4.",
    );
  }
  if (options.currentCycle < 1 || !Number.isInteger(options.currentCycle)) {
    throw new Error(
      "SEPTARIS | Invalid current cycle. Must be a positive integer.",
    );
  }
  if (
    !options.priorityCamp.trim() ||
    !options.otherCamp.trim() ||
    options.priorityCamp === options.otherCamp
  ) {
    throw new Error(
      "SEPTARIS | Both priorityCamp and otherCamp must be provided and distinct.",
    );
  }
}

export function getNextPhase(options: ConflictState): NextPhaseResult {
  validateConflictState(options);

  const nextPhase: Phase =
    options.currentPhase === 4 ? 1 : ((options.currentPhase + 1) as Phase);
  return {
    nextPhase: nextPhase,
    nextCycle:
      nextPhase === 1 ? options.currentCycle + 1 : options.currentCycle,
    activeCamp: getActiveCamp({
      currentPhase: nextPhase,
      priorityCamp: options.priorityCamp,
      otherCamp: options.otherCamp,
    }),
  };
}

export function getPreviousPhase(options: ConflictState): PrevPhaseResult {
  validateConflictState(options);

  if (options.currentCycle === 1 && options.currentPhase === 1) {
    throw new Error("Impossible to move to previous Phase");
  }

  const prevPhase: Phase =
    options.currentPhase === 1 ? 4 : ((options.currentPhase - 1) as Phase);
  return {
    prevPhase: prevPhase,
    prevCycle:
      prevPhase === 4 ? options.currentCycle - 1 : options.currentCycle,
    activeCamp: getActiveCamp({
      currentPhase: prevPhase,
      priorityCamp: options.priorityCamp,
      otherCamp: options.otherCamp,
    }),
  };
}

export function getNextCycle(options: ConflictState): NextPhaseResult {
  validateConflictState(options);

  const nextPhase: Phase = 1;
  return {
    nextPhase: nextPhase,
    nextCycle: options.currentCycle + 1,
    activeCamp: getActiveCamp({
      currentPhase: nextPhase,
      priorityCamp: options.priorityCamp,
      otherCamp: options.otherCamp,
    }),
  };
}

export function getPreviousCycle(options: ConflictState): PrevPhaseResult {
  validateConflictState(options);

  if (options.currentCycle === 1) {
    throw new Error("Impossible to move to previous Cycle");
  }

  const prevPhase: Phase = 1;

  return {
    prevPhase: prevPhase,
    prevCycle: options.currentCycle - 1,
    activeCamp: getActiveCamp({
      currentPhase: prevPhase,
      priorityCamp: options.priorityCamp,
      otherCamp: options.otherCamp,
    }),
  };
}

export function getActiveCamp(options: {
  priorityCamp: string;
  otherCamp: string;
  currentPhase: Phase;
}): string {
  return options.currentPhase % 2 === 1
    ? options.priorityCamp
    : options.otherCamp;
}
