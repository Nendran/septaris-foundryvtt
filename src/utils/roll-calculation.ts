export const ROLL_MODES = {
  NORMAL: "normal",
  ADVANTAGE: "advantage",
  DISADVANTAGE: "disadvantage",
} as const;

export const calculateCharacteristicSkillBonus = (
  skillModifier: number,
  proficiency: number,
): number => {
  if (skillModifier <= 0) {
    return skillModifier + proficiency - 1;
  }

  return skillModifier * proficiency;
};

export const buildFormula = (
  mode: "normal" | "advantage" | "disadvantage",
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
