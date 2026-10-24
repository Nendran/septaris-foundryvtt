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
    position: {
      width: 1020,
      height: 720,
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    window: { resizable: true },
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
    form: {
      template: `${SYSTEM_PATH}/templates/actors/character-sheet.hbs`,
    },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.document;
    context.system = this.document.system;

    return context;
  }

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    if (partId !== "form") return;

    htmlElement
      .querySelectorAll("[data-action='update-capacity']")
      .forEach((element) => {
        element.addEventListener("click", async (event) => {
          event.preventDefault();

          const capacityKey = element.dataset.capacity;

          const newProficiency =
            this.document.system.getNextCapacityProficiency(capacityKey);

          await this.document.update({
            [`system.capacities.${capacityKey}`]: newProficiency,
          });
        });
      });
    htmlElement
      .querySelector("#roll")
      .addEventListener("click", async (event) => {
        event.preventDefault();
        await this.document.system.roll();
      });
  }
}
