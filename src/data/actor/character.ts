import type { ModelPropsFromSchema } from "@common/data/fields.mjs";
import { calculateCharacteristicModifiers } from "../../rules/character/characteristics.js";
import { calculateDefense } from "../../rules/character/defense.js";
import { calculateMaxHealth } from "../../rules/character/health.js";
import { calculateNextSkillProficiency } from "../../rules/character/skill.js";
import { calculateSpeed } from "../../rules/character/speed.js";
import type {
  characteristicsModifiers,
  Proficiency,
} from "../../rules/character/types.js";
import { defineSharedSchema, type SkillKey } from "./shared-fields.js";

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
    defenseBonus: new fields.NumberField<number, number, true, false, true>({
      required: true,
      nullable: false,
      integer: true,
      min: 0,
      initial: 0,
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

  declare defenseBonus: CharacterProps["defenseBonus"];

  static override defineSchema = defineCharacterSchema;

  get defense(): number {
    return calculateDefense(
      this.characteristics.dexterity,
      this.characteristics.constitution,
    );
  }

  get weaponDamage(): number {
    return 0;
  }

  get speed(): number {
    return calculateSpeed();
  }

  async takeDamage(damage: number) {
    const newHealth = this.health.value - damage;
    await this.parent.update({
      "system.health.value": Math.max(0, newHealth),
    });
  }

  /** @inheritDoc */
  override prepareDerivedData(): void {
    super.prepareDerivedData();

    this.characteristicsModifiers = calculateCharacteristicModifiers(
      this.characteristics.strength,
      this.characteristics.dexterity,
      this.characteristics.constitution,
      this.characteristics.intelligence,
      this.characteristics.instinct,
      this.characteristics.charisma,
    );

    this.health.max = calculateMaxHealth(this.characteristics.constitution);

    this.health.value = Math.min(this.health.value, this.health.max);
  }

  getNextSkillProficiency(skillKey: SkillKey): Proficiency {
    return calculateNextSkillProficiency(this.skills[skillKey] as Proficiency);
  }
}
