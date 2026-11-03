export const ROLL_MODES = {
  NORMAL: "normal",
  ADVANTAGE: "advantage",
  DISADVANTAGE: "disadvantage",
} as const;

export type RollMode = (typeof ROLL_MODES)[keyof typeof ROLL_MODES];

export const calculateCharacteristicSkillBonus = (
  characteristicModifier: number,
  proficiency: number,
): number => {
  if (characteristicModifier <= 0) {
    return characteristicModifier + proficiency - 1;
  }

  return characteristicModifier * proficiency;
};

export const buildFormula = (
  mode: RollMode,
  narration: number,
  bonus: number,
  characteristicSkillBonus: number,
): string => {
  const totalBonus = narration + bonus + characteristicSkillBonus;

  let dice = "1d20";

  if (mode === ROLL_MODES.ADVANTAGE) {
    dice = "2d20kh";
  }

  if (mode === ROLL_MODES.DISADVANTAGE) {
    dice = "2d20kl";
  }

  return `${dice}${formatModifier(totalBonus)}`;
};

function formatModifier(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  if (value < 0) {
    return `${value}`;
  }

  return "";
}
