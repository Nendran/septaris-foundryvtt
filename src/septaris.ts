/// <reference types="@dfreds/foundry-types" />
import { CharacterData } from "./data/actor/character.js";
import { NPCData } from "./data/actor/npc.js";
import { SeptarisCombatDocument } from "./documents/septaris-combat.js";
import { SeptarisCharacterSheet } from "./sheets/character-sheet.js";
import { SeptarisConflitSetupDialog } from "./sheets/dialogs/conflit-setup-dialog.js";
import { SeptarisNPCSheet } from "./sheets/npc-sheet.js";
import { SYSTEM_ID } from "./utils/constants.js";
import { registerHandlebarsHelpers } from "./utils/handlebars.js";
import { localizeLabel } from "./utils/localisation.js";

Hooks.once("init", () => {
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.npc = NPCData;

  CONFIG.Combat.documentClass = SeptarisCombatDocument;

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

  DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    SYSTEM_ID,
    SeptarisNPCSheet,
    {
      types: ["npc"],
      makeDefault: true,
    },
  );

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["health"],
      value: [],
    },
    npc: {
      bar: ["health"],
      value: [],
    },
  };

  registerHandlebarsHelpers();

  Hooks.on("renderCombatTracker", (app, element) => {
    if (
      !(
        app instanceof foundry.applications.sidebar.tabs.CombatTracker &&
        element instanceof HTMLElement
      )
    ) {
      throw new Error("SEPTARIS | renderCombatTracker | Arguments invalids");
    }
    element.querySelector(".septaris-prepare-conflict")?.remove();

    if (!game.user?.isGM) return;

    const combat = app.viewed;

    if (!(combat instanceof SeptarisCombatDocument)) return;
    if (combat.started) return;

    const footer = element.querySelector<HTMLElement>(
      '[data-application-part="footer"], #combat-controls, .combat-controls',
    );

    if (!footer) return;

    const button = document.createElement("button");

    button.type = "button";
    button.className = "septaris-prepare-conflict";

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-users";

    button.append(
      icon,
      document.createTextNode(
        localizeLabel(
          "SEPTARIS.Interface.PrepareConflict",
          "Préparer le conflit",
        ),
      ),
    );

    button.addEventListener("click", async () => {
      button.disabled = true;

      try {
        const dialog = new SeptarisConflitSetupDialog();
        await dialog.openConflictSetupDialog(combat);
      } catch (error) {
        console.error("SEPTARIS | Conflict setup error:", error);

        ui.notifications.error(
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        button.disabled = false;
      }
    });

    // Placement au-dessus des commandes natives
    footer.before(button);
  });
});
