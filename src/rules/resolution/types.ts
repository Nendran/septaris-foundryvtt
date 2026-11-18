export const ROLL_MODES = {
  NORMAL: "normal",
  ADVANTAGE: "advantage",
  DISADVANTAGE: "disadvantage",
} as const;

export type RollMode = (typeof ROLL_MODES)[keyof typeof ROLL_MODES];

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
