import { formatModifier } from "../../rules/resolution/modifiers";
import { ROLL_MODES, type RollMode } from "../../rules/resolution/types";

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
