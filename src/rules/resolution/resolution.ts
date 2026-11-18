import type { ResolutionDegree } from "./types";

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
