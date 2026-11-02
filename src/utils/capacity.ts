import { localizeLabel } from "./localisation.js";

export function capacityName(capacity: string) {
  const localized = localizeLabel(
    `SEPTARIS.CAPACITIES.${capacity.toUpperCase()}`,
  );

  return localized.charAt(0).toUpperCase() + localized.slice(1).toLowerCase();
}

export function capacityProficiency(proficiency: number) {
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
  let localized = localizeLabel("SEPTARIS.CAPACITIES.PROFICIENCY.NOVICE");
  if (proficiency === 2) {
    localized = localizeLabel("SEPTARIS.CAPACITIES.PROFICIENCY.ADEPT");
  }
  if (proficiency === 3) {
    localized = localizeLabel("SEPTARIS.CAPACITIES.PROFICIENCY.EXPERT");
  }
  return localized.charAt(0).toUpperCase() + localized.slice(1).toLowerCase();
}
