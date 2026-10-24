import { SeptarisRollDialog } from "../../sheets/dialogs/roll-dialog.mjs";
import { getRollMessageModeLabel, ROLL_MODES } from "../../utils/rolls.mjs";

const { HTMLField, SchemaField, NumberField } = foundry.data.fields;

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      background: new SchemaField({
        biography: new HTMLField(),
      }),
      health: new SchemaField({
        value: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 10,
        }),
        min: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
        max: new NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 10,
        }),
      }),
      skills: new SchemaField({
        strength: new NumberField({
          required: true,
          integer: true,
          min: 0,
          max: 20,
          initial: 10,
        }),
        dexterity: new NumberField({
          required: true,
          integer: true,
          min: 0,
          max: 20,
          initial: 10,
        }),
        constitution: new NumberField({
          required: true,
          integer: true,
          min: 0,
          max: 20,
          initial: 10,
        }),
        intelligence: new NumberField({
          required: true,
          integer: true,
          min: 0,
          max: 20,
          initial: 10,
        }),
        instinct: new NumberField({
          required: true,
          integer: true,
          min: 0,
          max: 20,
          initial: 10,
        }),
        charisma: new NumberField({
          required: true,
          integer: true,
          min: 0,
          max: 20,
          initial: 10,
        }),
      }),
      capacities: new SchemaField({
        acrobatics: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        addressing: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        crafts: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        athletics: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        handToHand: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        discretion: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        history: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        intimidation: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        medicine: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        perception: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        persuasion: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        representation: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        science: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        survival: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        traditions: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
        deception: new NumberField({
          required: true,
          integer: true,
          min: 1,
          max: 3,
          initial: 1,
        }),
      }),
      featDice: new NumberField({
        required: true,
        integer: true,
        min: 6,
        max: 10,
        initial: 10,
      }),
      xp: new NumberField({
        required: true,
        integer: true,
        min: 0,
        initial: 0,
      }),
      pe: new NumberField({
        required: true,
        integer: true,
        min: 0,
        initial: 0,
      }),
    };
  }

  /**
   * Determine whether the character is dead.
   * @type {boolean}
   */
  get dead() {
    return this.health.value <= this.health.min;
  }

  get defense() {
    return 10 + this.skills.dexterity;
  }

  get speed() {
    return 9;
  }

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Make sure HP cannot exceed its maximum.
    this.health.value = Math.min(this.health.value, this.health.max);

    // Derive level from XP.
    this.level = Math.floor(this.xp / 100);

    this.skillsModifiers = {
      strength: Math.floor((this.skills.strength - 10) / 2),
      dexterity: Math.floor((this.skills.dexterity - 10) / 2),
      constitution: Math.floor((this.skills.constitution - 10) / 2),
      intelligence: Math.floor((this.skills.intelligence - 10) / 2),
      instinct: Math.floor((this.skills.instinct - 10) / 2),
      charisma: Math.floor((this.skills.charisma - 10) / 2),
    };
  }

  getNextCapacityProficiency(capacityKey) {
    const currentProficiency = this.capacities[capacityKey];

    return currentProficiency < 3 ? currentProficiency + 1 : 1;
  }

  async roll() {
    const dialog = new SeptarisRollDialog({
      skills: this.skillsModifiers,
      capacities: this.capacities,
    });
    const rollOptions = await dialog.waitForResult();

    const messageMode = rollOptions.messageMode;

    const formula = this.buildFormula(
      rollOptions.mode,
      rollOptions.skill,
      rollOptions.capacity,
      Number(rollOptions.narration),
      Number(rollOptions.bonus ?? 0),
    );

    const flavor = this.buildRollFlavor(rollOptions);

    const roll = new Roll(formula, this.getRollData());
    const evaluate = await roll.evaluate();
    const featRoll = new Roll(
      `1d${this.featDice}cs${this.featDice}`,
      this.getRollData(),
    );
    const featEvaluate = await featRoll.evaluate();
    console.log("roll", evaluate.product, "featEvaluate", featEvaluate.product);
    await roll.toMessage(
      {
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor,
      },
      {
        messageMode,
      },
    );
    await featRoll.toMessage(
      {
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor,
      },
      {
        messageMode,
      },
    );
    return roll;
  }

  buildFormula(mode, skill, capacity, narration, bonus) {
    const totalBonus =
      narration + bonus + this.calculateSkillCapacityBonus(skill, capacity);
    let dice = "1d20";

    if (mode === ROLL_MODES.ADVANTAGE) dice = "2d20kh";
    if (mode === ROLL_MODES.DISADVANTAGE) dice = "2d20kl";

    return `${dice}+${totalBonus}`;
  }

  calculateSkillCapacityBonus(skill, capacity) {
    const skillModifier = Number(this.skillsModifiers[skill]);
    const proficiency = Number(this.capacities[capacity]);
    if (skillModifier <= 0) {
      return skillModifier + proficiency - 1;
    }

    return skillModifier * proficiency;
  }

  /**
   * Expose les modificateurs calculés sous @abilities.<clé>.mod.
   * Foundry renvoie les données système directement : copier les objets enrichis
   * évite de modifier le modèle de données ou de persister un modificateur périmé.
   */
  getRollData() {
    return {};
  }

  buildRollFlavor(rollOptions) {
    const parts = [];

    const visibilityLabel = this.#getVisibilityLabel(rollOptions.messageMode);
    if (visibilityLabel) parts.push(visibilityLabel);

    return `${this.parent.name} — ${parts.join(" • ")}`;
  }

  #getVisibilityLabel(messageMode) {
    return getRollMessageModeLabel(messageMode);
  }
}
