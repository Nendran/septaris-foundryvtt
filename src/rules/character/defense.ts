import { calculateCharacteristicModifier } from "./characteristics.js";

export function calculateDefense(
  dexterity: number,
  constitution: number,
): number {
  return (
    8 +
    calculateCharacteristicModifier(dexterity) +
    calculateCharacteristicModifier(constitution)
  );
}
