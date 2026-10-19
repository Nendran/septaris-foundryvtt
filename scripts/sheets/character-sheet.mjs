import { SYSTEM_PATH } from "../utils/constants.mjs";

const Base = foundry.applications.sheets.ActorSheetV2;
const Handlebars = foundry.applications.api.HandlebarsApplicationMixin;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class SeptarisCharacterSheet extends Handlebars(Base) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["septaris", "sheet", "actor"],
    width: 720,
    height: 600,
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    window: { resizable: true }
  };

  static TABS = {
    primary: {
      initial: "resume",
      tabs: [
        { id: "resume", label: "Résumé" },
        { id: "actions", label: "Actions" },
        { id: "abilities", label: "Aptitudes" },
        { id: "inventory", label: "Inventaire" },
        { id: "notes", label: "Notes" },
      ],
    },
  };

  static PARTS = {
    form: { template: `${SYSTEM_PATH}/templates/actors/character-sheet.hbs` },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.document;
    context.system = this.document.system;

    return context;
  }
}
