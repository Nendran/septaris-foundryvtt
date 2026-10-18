const {
  HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField
} = foundry.data.fields;

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      background: new SchemaField({
        biography: new HTMLField(),
      }),
      health: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
        min: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        max: new NumberField({ required: true, integer: true, min: 0, initial: 10 })
      }),
      proficiencies: new SchemaField({
        weapons: new ArrayField(new StringField()),
        skills: new ArrayField(new StringField())
      }),
      xp: new NumberField({ required: true, integer: true, min: 0, initial: 0 })
    };
  }

  /**
   * Determine whether the character is dead.
   * @type {boolean}
   */
  get dead() {
    return this.health.value <= this.health.min;
  }

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Make sure HP cannot exceed its maximum.
    this.health.value = Math.min(this.health.value, this.health.max);

    // Derive level from XP.
    this.level = Math.floor(this.xp / 100);
  }
}