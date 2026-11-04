import type { ModelPropsFromSchema } from "@common/data/fields.mjs";

const fields = foundry.data.fields;

function characteristicField() {
  return new fields.NumberField<number, number, true, false, true>({
    required: true,
    nullable: false,
    integer: true,
    min: 6,
    max: 20,
    initial: 10,
  });
}

function proficiencyField() {
  return new fields.NumberField<number, number, true, false, true>({
    required: true,
    nullable: false,
    integer: true,
    min: 1,
    max: 3,
    initial: 1,
  });
}

function defineCharacterSchema() {
  return {
    health: new fields.SchemaField({
      value: new fields.NumberField<number, number, true, false, true>({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        initial: 15,
      }),
      max: new fields.NumberField<number, number, true, false, true>({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        initial: 15,
      }),
    }),
    level: new fields.NumberField<number, number, true, false, true>({
      required: true,
      nullable: false,
      integer: true,
      min: 1,
      max: 20,
      initial: 1,
    }),
    pe: new fields.NumberField<number, number, true, false, true>({
      required: true,
      nullable: false,
      integer: true,
      min: 0,
      max: 200,
      initial: 10,
    }),
    characteristics: new fields.SchemaField({
      strength: characteristicField(),
      dexterity: characteristicField(),
      constitution: characteristicField(),
      intelligence: characteristicField(),
      instinct: characteristicField(),
      charisma: characteristicField(),
    }),
    skills: new fields.SchemaField({
      acrobatics: proficiencyField(),
      addressing: proficiencyField(),
      athletics: proficiencyField(),
      crafts: proficiencyField(),
      deception: proficiencyField(),
      discretion: proficiencyField(),
      handtohand: proficiencyField(),
      history: proficiencyField(),
      intimidation: proficiencyField(),
      medicine: proficiencyField(),
      perception: proficiencyField(),
      persuasion: proficiencyField(),
      representation: proficiencyField(),
      science: proficiencyField(),
      survival: proficiencyField(),
      traditions: proficiencyField(),
    }),
    featDice: new fields.NumberField<number, number, true, false, true>({
      required: true,
      nullable: false,
      integer: true,
      min: 6,
      max: 10,
      initial: 10,
      step: 2,
    }),
  };
}

export type CharacterSchema = ReturnType<typeof defineCharacterSchema>;

type ActorParent = InstanceType<typeof Actor.implementation>;

export type CharacteristicKey =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "instinct"
  | "charisma";

export type characteristicsModifiers = Record<CharacteristicKey, number>;

type CharacterProps = ModelPropsFromSchema<CharacterSchema>;

export type SkillKey = keyof CharacterProps["skills"];

export type Proficiency = 1 | 2 | 3;

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
    return 12 + this.characteristicsModifiers.dexterity;
  }

  get speed(): number {
    return 9;
  }

  /** @inheritDoc */
  override prepareDerivedData(): void {
    super.prepareDerivedData();

    this.characteristicsModifiers = {
      strength: Math.floor((this.characteristics.strength - 10) / 2),
      dexterity: Math.floor((this.characteristics.dexterity - 10) / 2),
      constitution: Math.floor((this.characteristics.constitution - 10) / 2),
      intelligence: Math.floor((this.characteristics.intelligence - 10) / 2),
      instinct: Math.floor((this.characteristics.instinct - 10) / 2),
      charisma: Math.floor((this.characteristics.charisma - 10) / 2),
    };

    this.health.max = 15 + this.characteristicsModifiers.constitution;

    this.health.value = Math.min(this.health.value, this.health.max);
  }

  getNextSkillProficiency(skillKey: SkillKey): Proficiency {
    const current = this.skills[skillKey] as Proficiency;

    return current === 3 ? 1 : ((current + 1) as Proficiency);
  }
}
