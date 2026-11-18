export type CharacteristicKey =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "instinct"
  | "charisma";

export type characteristicsModifiers = Record<CharacteristicKey, number>;

export type Proficiency = 1 | 2 | 3;
