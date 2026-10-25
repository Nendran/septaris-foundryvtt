import { SeptarisRollDialog } from "../sheets/dialogs/roll-dialog.mjs";

export const ROLL_MODES = Object.freeze({
  NORMAL: "normal",
  ADVANTAGE: "advantage",
  DISADVANTAGE: "disadvantage",
});

const DEFAULT_ROLL_MESSAGE_MODE = "public";
const EXCLUDED_ROLL_MESSAGE_MODES = new Set(["ic"]);

function getConfiguredMessageModes() {
  return globalThis.CONFIG?.ChatMessage?.modes ?? {};
}

function isRollMessageMode(value, modes = getConfiguredMessageModes()) {
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
      const label = mode?.label ?? value;
      return {
        value,
        label: globalThis.game?.i18n?.localize?.(label) ?? label,
        icon: mode?.icon ?? "",
      };
    });
}

export function getDefaultRollMessageMode() {
  const configuredDefault = globalThis.game?.settings?.get?.(
    "core",
    "messageMode",
  );
  return normalizeRollMessageMode(configuredDefault, DEFAULT_ROLL_MESSAGE_MODE);
}

export function normalizeRollMessageMode(value, fallback) {
  const modes = getConfiguredMessageModes();
  const requestedMode = typeof value === "string" ? value : "";
  if (isRollMessageMode(requestedMode, modes)) return requestedMode;

  const fallbackMode = typeof fallback === "string" ? fallback : "";
  if (isRollMessageMode(fallbackMode, modes)) return fallbackMode;

  const configuredDefault = globalThis.game?.settings?.get?.(
    "core",
    "messageMode",
  );
  if (isRollMessageMode(configuredDefault, modes)) return configuredDefault;
  if (isRollMessageMode(DEFAULT_ROLL_MESSAGE_MODE, modes))
    return DEFAULT_ROLL_MESSAGE_MODE;

  return (
    Object.keys(modes).find((mode) => isRollMessageMode(mode, modes)) ??
    DEFAULT_ROLL_MESSAGE_MODE
  );
}

export function getRollMessageModeLabel(value) {
  const mode = normalizeRollMessageMode(value);
  const label = getConfiguredMessageModes()[mode]?.label ?? mode;
  return globalThis.game?.i18n?.localize?.(label) ?? label;
}

export const roll = async (character) => {
  const dialog = new SeptarisRollDialog({
    skills: character.skillsModifiers,
    capacities: character.capacities,
  });

  const rollOptions = await dialog.waitForResult();

  if (!rollOptions) return;

  const messageMode = rollOptions.messageMode;

  const skillCapacityBonus = calculateSkillCapacityBonus(rollOptions.skill, rollOptions.capacity, character.skillsModifiers, character.capacities)

  const formula = buildFormula(
    rollOptions.mode,
    Number(rollOptions.narration),
    Number(rollOptions.bonus ?? 0),
    skillCapacityBonus
  );

  const flavor = buildRollFlavor(rollOptions, character);

  // Jet principal
  const roll = await new Roll(
    formula,
    getRollData(),
  ).evaluate();

  // Dé de prouesse
  const featRoll = await new Roll(
    `1d${character.featDice}`,
    getRollData(),
  ).evaluate();

  const result = calculateResult(roll, featRoll, rollOptions.difficulty, character.featDice)

  const templateData = {
    actorName: character.parent.name,
    actorImg: character.parent.img,
    capacity: rollOptions.capacity,
    skill: rollOptions.skill,
    modifier: skillCapacityBonus,
    narration: Number(rollOptions.narration),
    bonus: Number(rollOptions.bonus ?? 0),
    modeLabel: rollOptions.mode,
    modeClass: `roll-card__mode--${rollOptions.mode}`,
    roll,
    featRoll,
    featDie: character.featDice,
    featSuccess: featRoll.total === character.featDice,
    hasDifficulty: true,
    difficulty: rollOptions.difficulty,
    marginLabel: result.margin,
    finalMarginLabel: result.finalMargin,
    outcomeLabel: "Résolution moyenne",
    outcomeDetail: "Prouesse",
    outcomeClass: `roll-card__outcome--${result.isSuccess ? 'success' : 'failure'}`,
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
    rolls: [roll, featRoll],
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
  };

  ChatMessage.applyMode(chatData, messageMode);

  await ChatMessage.create(chatData);

  return {
    roll,
    featRoll,
  };
}

const buildFormula = (mode, narration, bonus, skillCapacityBonus) => {
  const totalBonus =
    narration + bonus + skillCapacityBonus;
  let dice = "1d20";

  if (mode === ROLL_MODES.ADVANTAGE) dice = "2d20kh";
  if (mode === ROLL_MODES.DISADVANTAGE) dice = "2d20kl";

  return `${dice}+${totalBonus}`;
}

const calculateSkillCapacityBonus = (skill, capacity, skillsModifiers, capacities) => {
  const skillModifier = Number(skillsModifiers[skill]);
  const proficiency = Number(capacities[capacity]);
  if (skillModifier <= 0) {
    return skillModifier + proficiency - 1;
  }

  return skillModifier * proficiency;
}

const getRollData = () => {
  return {};
}

const buildRollFlavor = (rollOptions, character) => {
  const parts = [];

  const visibilityLabel = getRollMessageModeLabel(rollOptions.messageMode);
  if (visibilityLabel) parts.push(visibilityLabel);

  return `${character.parent.name} — ${parts.join(" • ")}`;
}

const calculateResult = (roll, featRoll, difficulty, featDice) => {
  const margin = Number(roll.total) - difficulty;
  const featResult = Number(featRoll.total) === featDice;
  let finalMargin = margin
  if (featResult) {
    if (margin >= 0) {
      finalMargin = margin * 2
    } else {
      finalMargin = 0
    }
  }
    
  const isSuccess = margin >= 0;
  return {
    margin,
    featResult,
    isSuccess,
    finalMargin
  }
}