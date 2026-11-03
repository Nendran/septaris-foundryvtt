import { localizeLabel } from "./localisation.js";

export function skillName(skill: string) {
  const localized = localizeLabel(`SEPTARIS.Skills.${skill.toUpperCase()}`);

  return localized.charAt(0).toUpperCase() + localized.slice(1).toLowerCase();
}

export function skillProficiency(proficiency: number) {
  if (proficiency === 1) {
    return "○";
  }
  if (proficiency === 2) {
    return "●";
  }
  if (proficiency === 3) {
    return "◆";
  }
}

export function proficiencyName(proficiency: number) {
  let localized = localizeLabel("SEPTARIS.Skills.Proficiency.Novice");
  if (proficiency === 2) {
    localized = localizeLabel("SEPTARIS.Skills.Proficiency.Adept");
  }
  if (proficiency === 3) {
    localized = localizeLabel("SEPTARIS.Skills.Proficiency.Expert");
  }
  return localized.charAt(0).toUpperCase() + localized.slice(1).toLowerCase();
}
