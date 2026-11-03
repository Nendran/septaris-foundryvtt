import type { CharacterData } from "../data/actor/character.js";
import {
  type RollDialogResult,
  SeptarisRollDialog,
} from "../sheets/dialogs/roll-dialog.js";
import { resolveAction } from "./resolution.js";

export type ChatMessageMode = NonNullable<
  Parameters<typeof ChatMessage.applyMode>[1]
>;

export const ROLL_MODES = {
  NORMAL: "normal",
  ADVANTAGE: "advantage",
  DISADVANTAGE: "disadvantage",
} as const;

const DEFAULT_ROLL_MESSAGE_MODE = "public" as ChatMessageMode;

const EXCLUDED_ROLL_MESSAGE_MODES = new Set<string>(["ic"]);

function getConfiguredMessageModes() {
  return CONFIG.ChatMessage.modes;
}

function isRollMessageMode(
  value: unknown,
  modes = getConfiguredMessageModes(),
): value is ChatMessageMode {
  return (
    typeof value === "string" &&
    Object.hasOwn(modes, value) &&
    !EXCLUDED_ROLL_MESSAGE_MODES.has(value)
  );
}

export function getRollMessageModeChoices() {
  const modes = getConfiguredMessageModes();

  return Object.entries(modes)
    .filter(([value]) => isRollMessageMode(value, modes))
    .map(([value, mode]) => {
      const label = mode.label ?? value;

      return {
        value,
        label: game.i18n.localize(label) ?? label,
        icon: mode.icon ?? "",
      };
    });
}

export function getDefaultRollMessageMode(): ChatMessageMode {
  const configuredDefault = game.settings.get("core", "messageMode");

  return normalizeRollMessageMode(configuredDefault, DEFAULT_ROLL_MESSAGE_MODE);
}

export function normalizeRollMessageMode(
  value: unknown,
  fallback?: string,
): ChatMessageMode {
  const modes = getConfiguredMessageModes();

  if (isRollMessageMode(value, modes)) {
    return value;
  }

  if (isRollMessageMode(fallback, modes)) {
    return fallback;
  }

  const configuredDefault = game.settings.get("core", "messageMode");

  if (isRollMessageMode(configuredDefault, modes)) {
    return configuredDefault;
  }

  if (isRollMessageMode(DEFAULT_ROLL_MESSAGE_MODE, modes)) {
    return DEFAULT_ROLL_MESSAGE_MODE;
  }

  return (
    Object.keys(modes).find((mode) => isRollMessageMode(mode, modes)) ??
    DEFAULT_ROLL_MESSAGE_MODE
  );
}

export function getRollMessageModeLabel(value: unknown): string {
  const mode = normalizeRollMessageMode(value);

  const label = getConfiguredMessageModes()[mode]?.label ?? mode;

  return game.i18n.localize(label) ?? label;
}

export const roll = async (character: CharacterData) => {
  const dialog = new SeptarisRollDialog({
    skills: character.skillsModifiers,

    capacities: character.capacities,
  });

  const rollOptions = await dialog.waitForResult();

  if (!rollOptions) {
    return;
  }

  const messageMode = rollOptions.messageMode;

  const skillCapacityBonus = calculateSkillCapacityBonus(
    rollOptions.skill,
    rollOptions.capacity,
    character.skillsModifiers,
    character.capacities,
  );

  const formula = buildFormula(
    rollOptions.mode,
    rollOptions.narration,
    rollOptions.bonus,
    skillCapacityBonus,
  );

  const flavor = buildRollFlavor(rollOptions, character);

  // Jet principal
  const roll = await new Roll(formula, getRollData()).evaluate();

  // Dé de prouesse
  const featRoll = await new Roll(
    `1d${character.featDice}`,
    getRollData(),
  ).evaluate();

  const featSuccess = Number(featRoll.total) === character.featDice;

  const result = resolveAction({
    total: roll.total,
    target: rollOptions.difficulty,
    featSuccess,
  });

  const templateData = {
    actorName: character.parent.name,

    actorImg: character.parent.img,

    capacity: rollOptions.capacity,

    skill: rollOptions.skill,

    modifier: skillCapacityBonus,

    narration: rollOptions.narration,

    bonus: rollOptions.bonus,

    modeLabel: rollOptions.mode,

    modeClass: `roll-card__mode--${rollOptions.mode}`,

    roll,
    featRoll,

    featDie: character.featDice,

    featSuccess,

    hasDifficulty: true,

    difficulty: rollOptions.difficulty,

    marginLabel: result.margin,

    finalMarginLabel: result.finalMargin,

    outcomeLabel: game.i18n.localize(`SEPTARIS.Resolution.${result.outcome}`),

    outcomeDetail: featSuccess
      ? game.i18n.localize("SEPTARIS.Roll.FeatSuccess")
      : null,

    outcomeClass: `roll-card__outcome--${
      result.success ? "success" : "failure"
    }`,

    formula: roll.formula,
  };

  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/septaris/templates/chat/roll.hbs",
    templateData,
  );

  const chatData = {
    author: game.user.id,

    speaker: ChatMessage.getSpeaker({
      actor: character.parent,
    }),

    flavor,
    content,

    rolls: [JSON.stringify(roll.toJSON()), JSON.stringify(featRoll.toJSON())],

    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
  };

  ChatMessage.applyMode(chatData, messageMode);

  await ChatMessage.create(chatData);

  return {
    roll,
    featRoll,
  };
};

const buildFormula = (
  mode: RollDialogResult["mode"],
  narration: number,
  bonus: number,
  skillCapacityBonus: number,
): string => {
  const totalBonus = narration + bonus + skillCapacityBonus;

  let dice = "1d20";

  if (mode === ROLL_MODES.ADVANTAGE) {
    dice = "2d20kh";
  }

  if (mode === ROLL_MODES.DISADVANTAGE) {
    dice = "2d20kl";
  }

  return `${dice}${formatModifier(totalBonus)}`;
};

const calculateSkillCapacityBonus = (
  skill: string,
  capacity: string,
  skillsModifiers: CharacterData["skillsModifiers"],
  capacities: CharacterData["capacities"],
): number => {
  const skillValue = Reflect.get(skillsModifiers, skill);

  const proficiencyValue = Reflect.get(capacities, capacity);

  const skillModifier = typeof skillValue === "number" ? skillValue : 0;

  const proficiency =
    typeof proficiencyValue === "number" ? proficiencyValue : 1;

  if (skillModifier <= 0) {
    return skillModifier + proficiency - 1;
  }

  return skillModifier * proficiency;
};

const getRollData = (): Record<string, unknown> => {
  return {};
};

const buildRollFlavor = (
  rollOptions: RollDialogResult,
  character: CharacterData,
): string => {
  const parts: string[] = [];

  const visibilityLabel = getRollMessageModeLabel(rollOptions.messageMode);

  if (visibilityLabel) {
    parts.push(visibilityLabel);
  }

  return `${character.parent.name} — ${parts.join(" • ")}`;
};

function formatModifier(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  if (value < 0) {
    return `${value}`;
  }

  return "";
}
