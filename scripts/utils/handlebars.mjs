import {
  capacityName,
  capacityProficiency,
  proficiencyName,
} from "./capacity.mjs";
import { localizeLabel } from "./localisation.mjs";

export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("septarisLocalize", (key, fallback) =>
    localizeLabel(key, typeof fallback === "string" ? fallback : key),
  );

  Handlebars.registerHelper("capacityName", (capacity) =>
    capacityName(capacity),
  );
  Handlebars.registerHelper("capacityProficiency", (proficiency) =>
    capacityProficiency(proficiency),
  );
  Handlebars.registerHelper("proficiencyName", (proficiency) =>
    proficiencyName(proficiency),
  );
}
