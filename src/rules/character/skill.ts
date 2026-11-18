import type { Proficiency } from "./types";

export function calculateNextSkillProficiency(
  skillValue: Proficiency,
): Proficiency {
  return skillValue === 3 ? 1 : ((skillValue + 1) as Proficiency);
}
