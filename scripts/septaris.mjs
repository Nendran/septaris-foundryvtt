import { CharacterData } from "./data/actor/character.mjs";
import { SeptarisCharacterSheet } from "./sheets/character-sheet.mjs";
import { SYSTEM_ID } from "./utils/constants.mjs";
import { registerHandlebarsHelpers } from "./utils/handlebars.mjs";

Hooks.once("init", () => {
  const ActorsCollection = foundry.documents.collections.Actors;
  registerHandlebarsHelpers();

  CONFIG.Actor.dataModels.character = CharacterData;

  ActorsCollection.registerSheet(SYSTEM_ID, SeptarisCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SEPTARIS.Sheet.Character",
  });

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["health"],
      value: ["xp"],
    },
  };
});
