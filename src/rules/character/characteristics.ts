import type { characteristicsModifiers } from "./types";

export function calculateCharacteristicModifier(
  characteristicValue: number,
): number {
  return Math.floor((characteristicValue - 10) / 2);
}

export function calculateCharacteristicModifierFromActor(
  strength: number,
  dexterity: number,
  constitution: number,
  intelligence: number,
  instinct: number,
  charisma: number,
): characteristicsModifiers {
  return {
    strength: calculateCharacteristicModifier(strength),
    dexterity: calculateCharacteristicModifier(dexterity),
    constitution: calculateCharacteristicModifier(constitution),
    intelligence: calculateCharacteristicModifier(intelligence),
    instinct: calculateCharacteristicModifier(instinct),
    charisma: calculateCharacteristicModifier(charisma),
  };
}
