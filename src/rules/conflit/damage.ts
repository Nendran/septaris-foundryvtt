export function calculateDamage(
  marge: number,
  weaponDamage: number,
  bonus: number = 0,
) {
  return Math.max(0, marge + weaponDamage + bonus);
}
