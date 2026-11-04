import type { ModelPropsFromSchema } from "@common/data/fields.mjs";

const fields = foundry.data.fields;

export type CharacteristicKey =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "instinct"
  | "charisma";

export type characteristicsModifiers = Record<CharacteristicKey, number>;

export type Proficiency = 1 | 2 | 3;

type SharedSchema = ReturnType<typeof defineSharedSchema>;

export type SharedProps = ModelPropsFromSchema<SharedSchema>;

export type SkillKey = keyof SharedProps["skills"];

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

export function defineSharedSchema() {
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
  };
}
