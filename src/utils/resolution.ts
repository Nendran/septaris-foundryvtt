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

  outcome: ResolutionDegree;
}

export function getResolutionDegree(margin: number): ResolutionDegree {
  if (margin <= -16) {
    return "ExceptionalFailure";
  }

  if (margin <= -11) {
    return "StrongFailure";
  }

  if (margin <= -6) {
    return "MediumFailure";
  }

  if (margin <= -1) {
    return "WeakFailure";
  }

  if (margin === 0) {
    return "Limit";
  }

  if (margin <= 5) {
    return "WeakSuccess";
  }

  if (margin <= 10) {
    return "MediumSuccess";
  }

  if (margin <= 15) {
    return "StrongSuccess";
  }

  return "ExceptionalSuccess";
}

export function resolveAction({
  total,
  target,
  featSuccess,
}: {
  total: number;
  target: number;
  featSuccess: boolean;
}): ResolutionResult {
  const margin = total - target;

  let finalMargin = margin;
  let featEffect: FeatEffect = null;

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
