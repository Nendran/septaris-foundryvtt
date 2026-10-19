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
    width: 600,
    height: 600,
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    window: { resizable: true }
  };

  static TABS = {
    primary: {
      initial: "description",
      tabs: [
        { id: "description", label: "Description" },
        { id: "items", label: "Items" },
      ],
    },
  };

  static PARTS = {
    form: { template: `${SYSTEM_PATH}/templates/actors/character-sheet.hbs` },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.document;

    return context;
  }
}
