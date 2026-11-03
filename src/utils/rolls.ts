import type { CharacterData } from "../data/actor/character.js";
import {
  type RollDialogResult,
  SeptarisRollDialog,
} from "../sheets/dialogs/roll-dialog.js";
import { getRollMessageModeLabel } from "./chat-message-modes.js";
import { resolveAction } from "./resolution.js";
import {
  buildFormula,
  calculateCharacteristicSkillBonus,
} from "./roll-calculation.js";

export const roll = async (character: CharacterData) => {
  const dialog = new SeptarisRollDialog({
    characteristics: character.characteristicsModifiers,
    skills: character.skills,
  });

  const rollOptions = await dialog.waitForResult();

  if (!rollOptions) {
    return;
  }

  const messageMode = rollOptions.messageMode;

  const characteristicValue = Reflect.get(
    character.characteristicsModifiers,
    rollOptions.characteristic,
  );

  const proficiencyValue = Reflect.get(character.skills, rollOptions.skill);

  const characteristicModifier =
    typeof characteristicValue === "number" ? characteristicValue : 0;

  const proficiency =
    typeof proficiencyValue === "number" ? proficiencyValue : 1;

  const characteristicSkillBonus = calculateCharacteristicSkillBonus(
    characteristicModifier,
    proficiency,
  );

  const formula = buildFormula(
    rollOptions.mode,
    rollOptions.narration,
    rollOptions.bonus,
    characteristicSkillBonus,
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
    characteristic: rollOptions.characteristic,
    skill: rollOptions.skill,
    modifier: characteristicSkillBonus,
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
