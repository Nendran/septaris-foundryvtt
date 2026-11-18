import type { CharacterData } from "../../data/actor/character.js";
import type { NPCData } from "../../data/actor/npc.js";
import { calculateCharacteristicSkillBonus } from "../../rules/resolution/modifiers.js";
import { getResolutionDegree } from "../../rules/resolution/resolution.js";
import type {
  FeatEffect,
  ResolutionResult,
} from "../../rules/resolution/types.js";
import {
  type RollDialogResult,
  SeptarisRollDialog,
} from "../../sheets/dialogs/roll-dialog.js";
import { getRollMessageModeLabel } from "./chat-message-modes.js";
import { buildFormula } from "./roll-formula.js";

export function resolveAction({
  total,
  target,
  featSuccess,
}: {
  total: number;
  target: number;
  featSuccess: boolean;
}): ResolutionResult {
  const margin = total - target;

  let finalMargin = margin;
  let featEffect: FeatEffect = null;

  if (featSuccess) {
    if (margin < 0) {
      finalMargin = 0;
      featEffect = "rescue";
    } else {
      finalMargin = margin * 2;
      featEffect = "double";
    }
  }

  return {
    total,
    target,
    margin,
    finalMargin,
    success: finalMargin >= 0,
    featSuccess,
    featEffect,
    outcome: getResolutionDegree(finalMargin),
  };
}

export const roll = async (
  character: CharacterData | NPCData,
  withFeatDie: boolean = true,
) => {
  const dialog = new SeptarisRollDialog({
    characteristics: character.characteristicsModifiers,
    skills: character.skills,
    withFeatDie,
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

  let featRoll: Roll | undefined;
  let featSuccess: boolean | undefined;
  if (withFeatDie && "featDice" in character) {
    // Dé de prouesse
    featRoll = await new Roll(
      `1d${character.featDice}`,
      getRollData(),
    ).evaluate();

    featSuccess = Number(featRoll.total) === character.featDice;
  }

  const result = resolveAction({
    total: roll.total,
    target: rollOptions.difficulty,
    featSuccess: featSuccess ?? false,
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
    withFeatDie,
    featRoll,
    featDie: "featDice" in character ? character.featDice : undefined,
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

  const rolls = [JSON.stringify(roll.toJSON())];

  if (featRoll) {
    rolls.push(JSON.stringify(featRoll.toJSON()));
  }

  const chatData = {
    author: game.user.id,
    speaker: ChatMessage.getSpeaker({
      actor: character.parent,
    }),
    flavor,
    content,
    rolls,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
  };

  ChatMessage.applyMode(chatData, messageMode);

  await ChatMessage.create(chatData);

  return {
    roll,
    featRoll,
  };
};

export const rollInitiative = async (character: CharacterData) => {
  const formula = buildFormula(
    "normal",
    0,
    0,
    character.characteristicsModifiers.dexterity,
  );

  // Jet principal
  const roll = await new Roll(formula, getRollData()).evaluate();

  return {
    roll,
  };
};

const getRollData = (): Record<string, unknown> => {
  return {};
};

const buildRollFlavor = (
  rollOptions: RollDialogResult,
  character: CharacterData | NPCData,
): string => {
  const parts: string[] = [];

  const visibilityLabel = getRollMessageModeLabel(rollOptions.messageMode);

  if (visibilityLabel) {
    parts.push(visibilityLabel);
  }

  return `${character.parent.name} — ${parts.join(" • ")}`;
};
