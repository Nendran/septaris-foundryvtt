import type { Token } from "@client/canvas/placeables/_module.mjs";
import { CharacterData } from "../../data/actor/character.js";
import { NPCData } from "../../data/actor/npc.js";
import { calculateDamage } from "../../rules/conflit/damage.js";
import { calculateCharacteristicSkillBonus } from "../../rules/resolution/modifiers.js";
import { resolveAction } from "../../rules/resolution/resolution.js";
import {
  type RollDialogResult,
  SeptarisRollDialog,
} from "../../sheets/dialogs/roll-dialog.js";
import { requestDamageApplication } from "../network/damage-requests.js";
import { getRollMessageModeLabel } from "./chat-message-modes.js";
import { buildFormula } from "./roll-formula.js";

export type RollType = "default" | "attack";

export const roll = async (
  character: CharacterData | NPCData,
  withFeatDie: boolean = true,
  type: RollType = "default",
) => {
  const dialog = new SeptarisRollDialog({
    characteristics: character.characteristicsModifiers,
    skills: character.skills,
    withFeatDie,
    type,
  });
  const targets: Token[] = Array.from(game.user.targets);
  if (type === "attack") {
    if (targets.length === 0) {
      ui.notifications.error("SEPTARIS.Roll.NoTarget", { localize: true });
      return;
    }
    if (targets.length > 1) {
      ui.notifications.error("SEPTARIS.Roll.TooManyTargets", {
        localize: true,
      });
      return;
    }

    for (const target of targets) {
      if (
        !(target.actor?.system instanceof CharacterData) &&
        !(target.actor?.system instanceof NPCData)
      ) {
        ui.notifications.error("SEPTARIS.Roll.InvalidTargets", {
          localize: true,
        });
        return;
      }
    }
  }

  const rollOptions = await dialog.waitForResult();

  if (!rollOptions) {
    return;
  }

  let difficulty = rollOptions.difficulty;

  if (
    type === "attack" &&
    (targets[0].actor?.system instanceof CharacterData ||
      targets[0].actor?.system instanceof NPCData)
  ) {
    difficulty = targets[0].actor?.system.defense;
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
    target: difficulty,
    featSuccess: featSuccess ?? false,
  });

  let damage: number = 0;

  if (type === "attack" && result.finalMargin >= 0) {
    const defender = targets[0].actor;
    const system = defender?.system;

    if (
      defender === null ||
      system === null ||
      !(system instanceof CharacterData || system instanceof NPCData)
    ) {
      throw new Error(`Septaris | Unvailable target`);
    }
    damage = calculateDamage(result.finalMargin, character.weaponDamage);
    await system.takeDamage(damage);
  }

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
    difficulty: difficulty,
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
    rollType: type,
    defender: type === "attack" ? targets[0].actor : "",
    damage,
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
    flags:
      type === "attack" && targets[0]?.document
        ? {
            septaris: {
              attack: {
                kind: "attack",
                attackerUuid: character.parent.uuid,
                targetTokenUuid: targets[0].document.uuid,
              },
            },
          }
        : {},
  };

  ChatMessage.applyMode(chatData, messageMode);

  const message = await ChatMessage.create(chatData);

  try {
    if (!message?.uuid) {
      throw new Error("SEPTARIS | Message d'attaque non enregistré");
    }

    const application = await requestDamageApplication(message.uuid);

    if (!application.applied && !application.alreadyApplied) {
      ui.notifications.warn("SEPTARIS | Aucun dégât appliqué à la cible.");
    }
  } catch (error) {
    console.error("SEPTARIS | Erreur d'application des dégâts :", error);

    ui.notifications.error(
      "SEPTARIS | Impossible d'appliquer les dégâts automatiquement.",
    );
  }

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
