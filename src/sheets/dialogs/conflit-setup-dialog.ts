import type {
  ApplicationClosingOptions,
  ApplicationRenderContext,
} from "@client/applications/_module.mjs";
import type { HandlebarsRenderOptions } from "@client/applications/api/_module.mjs";
import type { FormDataExtended } from "@client/applications/ux/_module.mjs";
import {
  assignCombatantToCamp,
  type ConflictCamp,
  getConflictCamps,
  getPlayerCampId,
  initializeConflictGroups,
  setPlayerCampId,
} from "../../utils/conflict-groups.js";
import { SYSTEM_PATH } from "../../utils/constants.js";
import { localizeLabel } from "../../utils/localisation.js";

interface ConflitSetupConfig {
  title: string;
}

interface Assignement {
  combatantId: string;
  campId: string;
}

interface SeptarisConflitSetupData {
  playerCampId: string | undefined;
  assignments: Assignement[];
  errors: string[];
}

interface SimpleCombatant {
  id: string;
  name: string;
  campId: string | null;
}

interface ConflitSetupDialogContext extends ApplicationRenderContext {
  conflitSetupConfig: ConflitSetupConfig;
  camps: ConflictCamp[];
  combatants: SimpleCombatant[];
  playerCampId: string | null;
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SeptarisConflitSetupDialog extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  conflitSetupConfig: ConflitSetupConfig;

  private combat: SeptarisCombat | null = null;

  private _submitted = false;

  private _resolver: ((result: undefined) => void) | null = null;

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["septaris", "conflit-setup-dialog"],
    position: {
      width: 650,
    },
    actions: {
      "cancel-conflit": this.#handleCancel,
    },
    form: {
      closeOnSubmit: false,
      handler: this.#handleSubmit,
    },
    window: {
      title: localizeLabel("SEPTARIS.Interface.ConflitSetup"),
      resizable: false,
    },
  };

  static PARTS = {
    form: {
      template: `${SYSTEM_PATH}/templates/dialogs/conflit-setup-dialog.hbs`,
    },
  };

  constructor(
    {
      title = localizeLabel("SEPTARIS.Interface.ConflitSetup"),
    }: Partial<ConflitSetupConfig> = {},
    options = {},
  ) {
    super(options);

    this.conflitSetupConfig = {
      title,
    };
  }

  get title(): string {
    return this.conflitSetupConfig.title;
  }

  async openConflictSetupDialog(combat: SeptarisCombat): Promise<void> {
    this.combat = combat;
    await initializeConflictGroups(combat);
    return new Promise<void>((resolve) => {
      this._resolver = resolve;

      this.render({
        force: true,
      });
    });
  }

  override async _prepareContext(
    options: HandlebarsRenderOptions,
  ): Promise<ConflitSetupDialogContext> {
    const context = await super._prepareContext(options);

    if (!this.combat) {
      throw new Error("Combat not defined");
    }

    const camps = getConflictCamps(this.combat);
    const combatants: SimpleCombatant[] = [];
    for (const combatant of this.combat.combatants) {
      combatants.push({
        name: combatant.name,
        id: combatant.id,
        campId:
          camps.find((camp) =>
            camp.members.some((member) => member.id === combatant.id),
          )?.id || null,
      });
    }
    let playerCampId = getPlayerCampId(this.combat);

    if (!playerCampId) {
      playerCampId =
        camps.find(
          (camp) =>
            camp.name === localizeLabel("SEPTARIS.Conflit.Camps.Adventurers"),
        )?.id || null;
    }

    return {
      ...context,

      conflitSetupConfig: this.conflitSetupConfig,
      camps,
      combatants,
      playerCampId,
    };
  }

  static async #handleSubmit(
    this: SeptarisConflitSetupDialog,
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: FormDataExtended,
  ): Promise<void> {
    const data = formData.object as Record<string, unknown>;
    // biome-ignore lint/complexity/noThisInStatic: Foundry ApplicationV2 binds `this` to the application instance.
    const combat = this.combat;

    if (!combat) {
      throw new Error("Combat not initialized");
    }

    // biome-ignore lint/complexity/noThisInStatic: Foundry ApplicationV2 binds `this` to the application instance.
    const validData = this.validateConflictSetup(combat, data);

    if (validData.errors.length > 0) {
      for (const error of validData.errors) {
        ui.notifications.error(error, { localize: true });
      }

      return;
    }

    if (!validData.playerCampId) {
      throw new Error("Invalid playerCampId");
    }

    await setPlayerCampId(combat, validData.playerCampId);

    for (const assignment of validData.assignments) {
      await assignCombatantToCamp(
        combat,
        assignment.combatantId,
        assignment.campId,
      );
    }

    // biome-ignore lint/complexity/noThisInStatic: Foundry ApplicationV2 binds `this` to the application instance.
    this._submitted = true;

    // biome-ignore lint/complexity/noThisInStatic: Foundry ApplicationV2 binds `this` to the application instance.
    await this.close();

    // biome-ignore lint/complexity/noThisInStatic: Foundry ApplicationV2 binds `this` to the application instance.
    this._resolver?.(undefined);

    // biome-ignore lint/complexity/noThisInStatic: Foundry ApplicationV2 binds `this` to the application instance.
    this._resolver = null;

    ui.notifications.success(
      "SEPTARIS.Interface.Notification.ConflictSetupSuccessfull",
      { localize: true },
    );
  }

  static async #handleCancel(this: SeptarisConflitSetupDialog): Promise<void> {
    // biome-ignore lint/complexity/noThisInStatic: Foundry ApplicationV2 binds `this` to the application instance.
    await this.close();
  }

  override async _preClose(options: ApplicationClosingOptions): Promise<void> {
    if (!this._submitted && this._resolver) {
      this._resolver(undefined);
      this._resolver = null;
    }

    await super._preClose(options);
  }

  validateConflictSetup(
    combat: SeptarisCombat,
    data: Record<string, unknown>,
  ): SeptarisConflitSetupData {
    let playerCampId: string | undefined;
    const assignments: Assignement[] = [];
    const errors: string[] = [];

    const groups = getConflictCamps(combat);

    for (const record in data) {
      if (!Object.hasOwn(data, record)) continue;

      const campId = data[record];

      if (record === "playerCampId" && typeof campId === "string") {
        if (!groups.some((g) => g.id === campId)) {
          errors.push("SEPTARIS.Notification.Error.PlayerCampIdInvalid");
          continue;
        }
        playerCampId = campId;
        continue;
      }

      if (record.startsWith("camp-") && typeof campId === "string") {
        const combatantId = record.replace("camp-", "");
        const combatant = combat.combatants.find((c) => c.id === combatantId);
        if (!combatant) {
          errors.push("SEPTARIS.Notification.Error.CombatantNotFoundInConflit");
          continue;
        }
        if (!groups.some((g) => g.id === campId)) {
          errors.push(
            "SEPTARIS.Notification.Error.CombatantCampNotFoundInCombat",
          );
          continue;
        }
        assignments.push({
          campId,
          combatantId: record.replace("camp-", ""),
        });
      }
    }

    if (!playerCampId) {
      errors.push("SEPTARIS.Notification.Error.NoPlayerCampDefined");
    }

    if (assignments.length !== combat.combatants.size) {
      errors.push(
        "SEPTARIS.Notification.Error.AssignmentsAndCombatantsAreNotSameSize",
      );
    }

    if (new Set(assignments.map((c) => c.campId)).size !== groups.length) {
      errors.push("SEPTARIS.Notification.Error.CampWithoutCombatant");
    }

    return {
      playerCampId,
      assignments,
      errors,
    };
  }
}
