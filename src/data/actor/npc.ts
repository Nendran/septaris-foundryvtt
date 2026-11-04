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
} from "./shared-fields.js";

function defineNPCSchema() {
  const sharedSchema = defineSharedSchema();

  return {
    ...sharedSchema,
  };
}

export type NPCSchema = ReturnType<typeof defineNPCSchema>;

type ActorParent = InstanceType<typeof Actor.implementation>;

type NPCProps = ModelPropsFromSchema<NPCSchema>;

export class NPCData extends foundry.abstract.TypeDataModel<
  ActorParent,
  NPCSchema
> {
  declare health: NPCProps["health"];

  declare level: NPCProps["level"];

  declare characteristics: NPCProps["characteristics"];

  declare skills: NPCProps["skills"];

  declare characteristicsModifiers: characteristicsModifiers;

  static override defineSchema = defineNPCSchema;

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
