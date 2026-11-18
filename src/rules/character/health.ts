import { calculateCharacteristicModifier } from "./characteristics";

export function calculateMaxHealth(constitution: number): number {
  return 15 + calculateCharacteristicModifier(constitution);
}
