import type { ModelPropsFromSchema } from "@common/data/fields.mjs";
import {
  getCharacteristicModifierFromActor,
  getDefenseFromActor,
  getMaxHealthFromActor,
  getNextSkillProficiency,
  getSpeedFromActor,
} from "../../utils/character-calculation.js";
import {
  type characteristicsModifiers,
  defineSharedSchema,
  type Proficiency,
  type SkillKey,
} from "./shared-fields";

const fields = foundry.data.fields;

function defineCharacterSchema() {
  const sharedSchema = defineSharedSchema();

  return {
    ...sharedSchema,
    pe: new fields.NumberField<number, number, true, false, true>({
      required: true,
      nullable: false,
      integer: true,
      min: 0,
      max: 200,
      initial: 10,
    }),
    featDice: new fields.NumberField<number, number, true, false, true>({
      required: true,
      nullable: false,
      integer: true,
      min: 6,
      max: 10,
      initial: 10,
      step: 2,
      choices: [6, 8, 10],
    }),
  };
}

export type CharacterSchema = ReturnType<typeof defineCharacterSchema>;

type ActorParent = InstanceType<typeof Actor.implementation>;

type CharacterProps = ModelPropsFromSchema<CharacterSchema>;

export class CharacterData extends foundry.abstract.TypeDataModel<
  ActorParent,
  CharacterSchema
> {
  declare health: CharacterProps["health"];

  declare level: CharacterProps["level"];

  declare pe: CharacterProps["pe"];

  declare featDice: CharacterProps["featDice"];

  declare characteristics: CharacterProps["characteristics"];

  declare skills: CharacterProps["skills"];

  declare characteristicsModifiers: characteristicsModifiers;

  static override defineSchema = defineCharacterSchema;

  get defense(): number {
    return getDefenseFromActor(this);
  }

  get speed(): number {
    return getSpeedFromActor(this);
  }

  /** @inheritDoc */
  override prepareDerivedData(): void {
    super.prepareDerivedData();

    this.characteristicsModifiers = getCharacteristicModifierFromActor(this);

    this.health.max = getMaxHealthFromActor(this);

    this.health.value = Math.min(this.health.value, this.health.max);
  }

  getNextSkillProficiency(skillKey: SkillKey): Proficiency {
    return getNextSkillProficiency(this.skills[skillKey] as Proficiency);
  }
}
