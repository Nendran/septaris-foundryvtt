export type Phase = 1 | 2 | 3 | 4;

export const SCOPE_FLAG = "septaris";
export const CURRENT_PHASE_FLAG = "currentPhase";
export const PRIORITY_CAMP_FLAG = "priorityCamp";
export const PLAYER_CAMP_ID_FLAG = "playerCampId";

type ConflictState = {
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

export function getActiveCamp(options: {
  priorityCamp: string;
  otherCamp: string;
  currentPhase: Phase;
}): string {
  return options.currentPhase % 2 === 1
    ? options.priorityCamp
    : options.otherCamp;
}
