import { CharacterData } from "./data/actor/character.mjs";
import { SeptarisCharacterSheet } from "./sheets/character-sheet.mjs";
import { SYSTEM_ID } from "./utils/constants.mjs";

Hooks.once("init", () => {
  const ActorsCollection = foundry.documents.collections.Actors;

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
  console.log(`${SYSTEM_ID} | register actor sheet`, SeptarisCharacterSheet);
});
