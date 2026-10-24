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

  Handlebars.registerHelper("capitalize", (str) => {
    if (typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  Handlebars.registerHelper("toUpperCase", (str) => {
    if (typeof str !== "string") return "";
    return str.toUpperCase();
  });

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
