import type { HandlebarsRenderOptions } from "@client/applications/api/_module.mjs";

import type { NPCData } from "../data/actor/npc.js";
import type { SkillKey } from "../data/actor/shared-fields.js";
import { SYSTEM_PATH } from "../utils/constants.js";
import { roll } from "../utils/rolls.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

const { ActorSheetV2 } = foundry.applications.sheets;

type SeptarisActor = foundry.documents.Actor & {
  system: NPCData;
};

/**
 * ActorSheetV2 is abstract because the rendering
 * methods are provided by HandlebarsApplicationMixin.
 */
abstract class SeptarisActorSheetV2 extends ActorSheetV2<SeptarisActor> {}

const SeptarisActorSheetBase = HandlebarsApplicationMixin(SeptarisActorSheetV2);

export class SeptarisNPCSheet extends SeptarisActorSheetBase {
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

  static PARTS = {
    form: {
      template: `${SYSTEM_PATH}/templates/actors/npc-sheet.hbs`,
    },
  };

  override async _prepareContext(
    options: Parameters<SeptarisActorSheetV2["_prepareContext"]>[0],
  ) {
    const context = await super._prepareContext(options);

    return {
      ...context,
      actor: this.document,
      system: this.document.system,
    };
  }

  override _attachPartListeners(
    partId: string,
    htmlElement: HTMLElement,
    options: HandlebarsRenderOptions,
  ): void {
    super._attachPartListeners(partId, htmlElement, options);

    if (partId !== "form") return;

    htmlElement
      .querySelectorAll<HTMLElement>("[data-action='update-skill']")
      .forEach((element) => {
        element.addEventListener("click", async (event) => {
          event.preventDefault();

          const skillKey = element.dataset.skill as SkillKey | undefined;

          if (!skillKey) return;

          const newProficiency =
            this.document.system.getNextSkillProficiency(skillKey);

          await this.document.update({
            [`system.skills.${skillKey}`]: newProficiency,
          });
        });
      });

    htmlElement
      .querySelector<HTMLElement>("#roll")
      ?.addEventListener("click", async (event) => {
        event.preventDefault();

        await roll(this.document.system, false);
      });
  }
}
