import { SYSTEM_PATH } from "../../utils/constants.mjs";
import { localizeLabel } from "../../utils/localisation.mjs";
import {
  getDefaultRollMessageMode,
  getRollMessageModeChoices,
  ROLL_MODES,
} from "../../utils/rolls.mjs";

const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SeptarisRollDialog extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
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

  constructor(options = {}) {
    const {
      title = localizeLabel("SEPTARIS.Interface.RollOptions"),
      skills = {},
      capacities = {},
      ...applicationOptions
    } = options;

    super(applicationOptions);

    this.rollConfig = {
      title,
      skills,
      capacities,
      messageMode: getDefaultRollMessageMode(),
    };

    this._resolver = null;
    this._submitted = false;
  }

  get title() {
    return this.rollConfig.title;
  }

  async waitForResult() {
    return new Promise((resolve) => {
      this._resolver = resolve;
      this.render({ force: true });
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.rollConfig = this.rollConfig;
    context.modes = [
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
    ];

    context.messageModes = getRollMessageModeChoices();

    return context;
  }

  static async #handleSubmit(_event, form, formData) {
    const data = formData.object ?? Object.fromEntries(new FormData(form));
    const result = {
      mode: data.mode,
      skill: data.skill,
      capacity: data.capacity,
      narration: data.narration,
      bonus: data.bonus,
      messageMode: data.messageMode,
      difficulty: data.difficulty
    };

    this._submitted = true;
    this._resolver?.(result);
    this._resolver = null;
  }

  static async #handleCancel() {
    await this.close();
  }

  async _preClose(options) {
    if (!this._submitted && this._resolver) {
      this._resolver(null);
      this._resolver = null;
    }

    return super._preClose(options);
  }
}
