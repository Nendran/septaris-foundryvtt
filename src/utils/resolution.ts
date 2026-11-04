export type ResolutionDegree =
  | "ExceptionalFailure"
  | "StrongFailure"
  | "MediumFailure"
  | "WeakFailure"
  | "Limit"
  | "WeakSuccess"
  | "MediumSuccess"
  | "StrongSuccess"
  | "ExceptionalSuccess";

export type FeatEffect = "rescue" | "double" | null;

export interface ResolutionResult {
  total: number;
  target: number;

  margin: number;
  finalMargin: number;

  success: boolean;

  featSuccess: boolean;
  featEffect: FeatEffect;

  outcome: string;
}

export const RESOLUTION_DEGREES = {
  EXCEPTIONAL_FAILURE: "ExceptionalFailure",
  STRONG_FAILURE: "StrongFailure",
  MEDIUM_FAILURE: "MediumFailure",
  WEAK_FAILURE: "WeakFailure",
  LIMIT: "Limit",
  WEAK_SUCCESS: "WeakSuccess",
  MEDIUM_SUCCESS: "MediumSuccess",
  STRONG_SUCCESS: "StrongSuccess",
  EXCEPTIONAL_SUCCESS: "ExceptionalSuccess",
};

export function getResolutionDegree(margin: number): string {
  if (margin <= -16) {
    return RESOLUTION_DEGREES.EXCEPTIONAL_FAILURE;
  }

  if (margin <= -11) {
    return RESOLUTION_DEGREES.STRONG_FAILURE;
  }

  if (margin <= -6) {
    return RESOLUTION_DEGREES.MEDIUM_FAILURE;
  }

  if (margin <= -1) {
    return RESOLUTION_DEGREES.WEAK_FAILURE;
  }

  if (margin === 0) {
    return RESOLUTION_DEGREES.LIMIT;
  }

  if (margin <= 5) {
    return RESOLUTION_DEGREES.WEAK_SUCCESS;
  }

  if (margin <= 10) {
    return RESOLUTION_DEGREES.MEDIUM_SUCCESS;
  }

  if (margin <= 15) {
    return RESOLUTION_DEGREES.STRONG_SUCCESS;
  }

  return RESOLUTION_DEGREES.EXCEPTIONAL_SUCCESS;
}

export function resolveAction({
  total,
  target,
  featSuccess,
}: {
  total: number;
  target: number;
  featSuccess?: boolean;
}) {
  const margin = total - target;

  let finalMargin = margin;
  let featEffect = null;

  if (featSuccess) {
    if (margin < 0) {
      finalMargin = 0;
      featEffect = "rescue";
    } else {
      finalMargin = margin * 2;
      featEffect = "double";
    }
  }

  return {
    total,
    target,
    margin,
    finalMargin,
    success: finalMargin >= 0,
    featSuccess,
    featEffect,
    outcome: getResolutionDegree(finalMargin),
  };
}
