import { calculateCharacteristicModifier } from "./characteristics.js";

export function calculateMaxHealth(constitution: number): number {
  return 15 + calculateCharacteristicModifier(constitution);
}
