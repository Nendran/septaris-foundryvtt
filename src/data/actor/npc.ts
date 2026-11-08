import type { ModelPropsFromSchema } from "@common/data/fields.mjs";
import {
  getCharacteristicModifierFromActor,
  getNextSkillProficiency,
  getSpeedFromActor,
} from "../../utils/character-calculation.js";
import {
  type characteristicsModifiers,
  defineSharedSchema,
  type Proficiency,
  type SkillKey,
} from "./shared-fields.js";

function defineNPCSchema() {
  const sharedSchema = defineSharedSchema();

  return {
    ...sharedSchema,
    defense: new fields.NumberField<number, number, true, false, true>({
      required: true,
      nullable: false,
      integer: true,
      min: 0,
      initial: 12,
    }),
  };
}

export type NPCSchema = ReturnType<typeof defineNPCSchema>;

type ActorParent = InstanceType<typeof Actor.implementation>;

type NPCProps = ModelPropsFromSchema<NPCSchema>;

const fields = foundry.data.fields;

export class NPCData extends foundry.abstract.TypeDataModel<
  ActorParent,
  NPCSchema
> {
  declare health: NPCProps["health"];

  declare level: NPCProps["level"];

  declare characteristics: NPCProps["characteristics"];

  declare defense: NPCProps["defense"];

  declare skills: NPCProps["skills"];

  declare characteristicsModifiers: characteristicsModifiers;

  static override defineSchema = defineNPCSchema;

  get speed(): number {
    return getSpeedFromActor(this);
  }

  /** @inheritDoc */
  override prepareDerivedData(): void {
    super.prepareDerivedData();

    this.characteristicsModifiers = getCharacteristicModifierFromActor(this);

    this.health.value = Math.min(this.health.value, this.health.max);
  }

  getNextSkillProficiency(skillKey: SkillKey): Proficiency {
    return getNextSkillProficiency(this.skills[skillKey] as Proficiency);
  }
}
