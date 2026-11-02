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

    skills: new fields.SchemaField({
      strength: characteristicField(),
      dexterity: characteristicField(),
      constitution: characteristicField(),
      intelligence: characteristicField(),
      instinct: characteristicField(),
      charisma: characteristicField(),
    }),

    capacities: new fields.SchemaField({
      acrobatics: proficiencyField(),
      addressing: proficiencyField(),
      athletics: proficiencyField(),
      craft: proficiencyField(),
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

export type CharacteristicModifiers = Record<CharacteristicKey, number>;

type CharacterProps = ModelPropsFromSchema<CharacterSchema>;

export type CapacityKey = keyof CharacterProps["capacities"];

export type Proficiency = 1 | 2 | 3;

export class CharacterData extends foundry.abstract.TypeDataModel<
  ActorParent,
  CharacterSchema
> {
  declare health: CharacterProps["health"];

  declare level: CharacterProps["level"];

  declare pe: CharacterProps["pe"];

  declare featDice: CharacterProps["featDice"];

  declare skills: CharacterProps["skills"];

  declare capacities: CharacterProps["capacities"];

  declare skillsModifiers: CharacteristicModifiers;

  static override defineSchema = defineCharacterSchema;

  get defense(): number {
    return 12 + this.skillsModifiers.dexterity;
  }

  get speed(): number {
    return 9;
  }

  /** @inheritDoc */
  override prepareDerivedData(): void {
    super.prepareDerivedData();

    this.skillsModifiers = {
      strength: Math.floor((this.skills.strength - 10) / 2),
      dexterity: Math.floor((this.skills.dexterity - 10) / 2),
      constitution: Math.floor((this.skills.constitution - 10) / 2),
      intelligence: Math.floor((this.skills.intelligence - 10) / 2),
      instinct: Math.floor((this.skills.instinct - 10) / 2),
      charisma: Math.floor((this.skills.charisma - 10) / 2),
    };

    this.health.max = 15 + this.skillsModifiers.constitution;

    this.health.value = Math.min(this.health.value, this.health.max);
  }

  getNextCapacityProficiency(capacityKey: CapacityKey): Proficiency {
    const current = this.capacities[capacityKey] as Proficiency;

    return current === 3 ? 1 : ((current + 1) as Proficiency);
  }
}
