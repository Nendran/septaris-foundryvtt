import { CharacterData } from "./data/actor/character.mjs";
import { SeptarisActorSheet } from "./sheets/actor-sheet.mjs";

Hooks.once("init", () => {
  const ActorsCollection = foundry.documents.collections.Actors;

  CONFIG.Actor.dataModels.character = CharacterData;
  
  ActorsCollection.registerSheet('septaris', SeptarisActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SEPTARIS.Sheet.Character",
  });

  
  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["health"],
      value: ["xp"]
    }
  };
});
