export const calculateCharacteristicSkillBonus = (
  characteristicModifier: number,
  proficiency: number,
): number => {
  if (characteristicModifier <= 0) {
    return characteristicModifier + proficiency - 1;
  }

  return characteristicModifier * proficiency;
};

export function formatModifier(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  if (value < 0) {
    return `${value}`;
  }

  return "";
}
