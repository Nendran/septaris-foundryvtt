import type {
  ApplicationClosingOptions,
  ApplicationRenderContext,
} from "@client/applications/_types.mjs";
import type { HandlebarsRenderOptions } from "@client/applications/api/_module.mjs";
import type FormDataExtended from "@client/applications/ux/form-data-extended.mjs";
import {
  type ChatMessageMode,
  getDefaultRollMessageMode,
  getRollMessageModeChoices,
  normalizeRollMessageMode,
} from "../../utils/chat-message-modes.js";
import { SYSTEM_PATH } from "../../utils/constants.js";
import { localizeLabel } from "../../utils/localisation.js";
import { ROLL_MODES, type RollMode } from "../../utils/roll-calculation.js";

interface RollDialogConfig {
  title: string;
  skills: Record<string, number>;
  characteristics: Record<string, number>;
  withFeatDie: boolean;
}

export interface RollDialogResult {
  characteristic: string;
  skill: string;
  narration: number;
  bonus: number;
  difficulty: number;
  mode: RollMode;

  messageMode: ChatMessageMode;
}

interface RollDialogContext extends ApplicationRenderContext {
  rollConfig: RollDialogConfig;

  modes: Array<{
    value: RollMode;
    label: string;
  }>;

  messageModes: ReturnType<typeof getRollMessageModeChoices>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function asRollMode(value: unknown): RollMode {
  if (value === ROLL_MODES.ADVANTAGE) {
    return "advantage";
  }

  if (value === ROLL_MODES.DISADVANTAGE) {
    return "disadvantage";
  }

  return "normal";
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SeptarisRollDialog extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  rollConfig: RollDialogConfig;

  private _resolver: ((result: RollDialogResult | null) => void) | null = null;

  private _submitted = false;

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["septaris", "roll-dialog"],
    position: {
      width: 650,
    },
    actions: {
      "cancel-roll": this.#handleCancel,
    },
    form: {
      closeOnSubmit: true,
      handler: this.#handleSubmit,
    },
    window: {
      title: localizeLabel("SEPTARIS.Interface.RollOptions"),
      resizable: false,
    },
  };

  static PARTS = {
    form: {
      template: `${SYSTEM_PATH}/templates/dialogs/roll-dialog.hbs`,
    },
  };

  constructor(
    {
      title = localizeLabel("SEPTARIS.Interface.RollOptions"),
      characteristics = {},
      skills = {},
      withFeatDie = true,
    }: Partial<RollDialogConfig> = {},
    options = {},
  ) {
    super(options);

    this.rollConfig = {
      title,
      skills,
      characteristics,
      withFeatDie,
    };
  }

  get title(): string {
    return this.rollConfig.title;
  }

  async waitForResult(): Promise<RollDialogResult | null> {
    return new Promise<RollDialogResult | null>((resolve) => {
      this._resolver = resolve;

      this.render({
        force: true,
      });
    });
  }

  override async _prepareContext(
    options: HandlebarsRenderOptions,
  ): Promise<RollDialogContext> {
    const context = await super._prepareContext(options);

    return {
      ...context,

      rollConfig: this.rollConfig,

      modes: [
        {
          value: ROLL_MODES.NORMAL,
          label: localizeLabel("SEPTARIS.Interface.Roll.Normal"),
        },
        {
          value: ROLL_MODES.ADVANTAGE,
          label: localizeLabel("SEPTARIS.Interface.Roll.Advantage"),
        },
        {
          value: ROLL_MODES.DISADVANTAGE,
          label: localizeLabel("SEPTARIS.Interface.Roll.Disadvantage"),
        },
      ],

      messageModes: getRollMessageModeChoices(),
    };
  }

  static async #handleSubmit(
    this: SeptarisRollDialog,
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: FormDataExtended,
  ): Promise<void> {
    const data = formData.object as Record<string, unknown>;

    const result: RollDialogResult = {
      mode: asRollMode(data.mode),
      characteristic: asString(data.characteristic),
      skill: asString(data.skill),
      narration: asNumber(data.narration, 0),
      bonus: asNumber(data.bonus, 0),
      messageMode: normalizeRollMessageMode(
        data.messageMode,
        getDefaultRollMessageMode(),
      ),
      difficulty: asNumber(data.difficulty, 10),
    };

    // biome-ignore lint/complexity/noThisInStatic: Foundry ApplicationV2 binds `this` to the application instance.
    this._submitted = true;

    // biome-ignore lint/complexity/noThisInStatic: Foundry ApplicationV2 binds `this` to the application instance.
    this._resolver?.(result);

    // biome-ignore lint/complexity/noThisInStatic: Foundry ApplicationV2 binds `this` to the application instance.
    this._resolver = null;
  }

  static async #handleCancel(this: SeptarisRollDialog): Promise<void> {
    // biome-ignore lint/complexity/noThisInStatic: Foundry ApplicationV2 binds `this` to the application instance.
    await this.close();
  }

  override async _preClose(options: ApplicationClosingOptions): Promise<void> {
    if (!this._submitted && this._resolver) {
      this._resolver(null);
      this._resolver = null;
    }

    await super._preClose(options);
  }
}
