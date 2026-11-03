import { localizeLabel } from "./localisation.js";
import { proficiencyName, skillName, skillProficiency } from "./skill.js";

export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("septarisLocalize", (key, fallback) =>
    localizeLabel(key, typeof fallback === "string" ? fallback : key),
  );

  Handlebars.registerHelper("capitalize", (str) => {
    if (typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  Handlebars.registerHelper("toUpperCase", (str) => {
    if (typeof str !== "string") return "";
    return str.toUpperCase();
  });

  Handlebars.registerHelper("skillName", (skill) => skillName(skill));
  Handlebars.registerHelper("skillProficiency", (proficiency) =>
    skillProficiency(proficiency),
  );
  Handlebars.registerHelper("proficiencyName", (proficiency) =>
    proficiencyName(proficiency),
  );
}
