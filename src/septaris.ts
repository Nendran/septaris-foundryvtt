/// <reference types="@dfreds/foundry-types" />
import { CharacterData } from "./data/actor/character.js";
import { SeptarisCharacterSheet } from "./sheets/character-sheet.js";
import { SYSTEM_ID } from "./utils/constants.js";
import { registerHandlebarsHelpers } from "./utils/handlebars.js";

Hooks.once("init", () => {
  CONFIG.Actor.dataModels.character = CharacterData;

  const { DocumentSheetConfig } = foundry.applications.apps;

  DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    SYSTEM_ID,
    SeptarisCharacterSheet,
    {
      types: ["character"],
      makeDefault: true,
    },
  );

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["health"],
      value: [],
    },
  };

  registerHandlebarsHelpers();
});
