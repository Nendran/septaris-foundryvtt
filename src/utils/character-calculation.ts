import type {
  characteristicsModifiers,
  Proficiency,
  SharedProps,
} from "../data/actor/shared-fields.js";

export function getCharacteristicModifier(characteristicValue: number): number {
  return Math.floor((characteristicValue - 10) / 2);
}

export function getCharacteristicModifierFromActor(
  actor: SharedProps,
): characteristicsModifiers {
  return {
    strength: getCharacteristicModifier(actor.characteristics.strength),
    dexterity: getCharacteristicModifier(actor.characteristics.dexterity),
    constitution: getCharacteristicModifier(actor.characteristics.constitution),
    intelligence: getCharacteristicModifier(actor.characteristics.intelligence),
    instinct: getCharacteristicModifier(actor.characteristics.instinct),
    charisma: getCharacteristicModifier(actor.characteristics.charisma),
  };
}

export function getNextSkillProficiency(skillValue: Proficiency): Proficiency {
  return skillValue === 3 ? 1 : ((skillValue + 1) as Proficiency);
}

export function getMaxHealthFromActor(actor: SharedProps): number {
  return 15 + getCharacteristicModifier(actor.characteristics.constitution);
}

export function getDefenseFromActor(actor: SharedProps): number {
  return 12 + getCharacteristicModifier(actor.characteristics.dexterity);
}

export function getSpeedFromActor(_actor: SharedProps): number {
  return 9;
}
