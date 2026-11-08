import type Collection from "@common/utils/collection.mjs";
import {
  CURRENT_PHASE_FLAG,
  getNextPhase,
  type Phase,
  PRIORITY_CAMP_FLAG,
  SCOPE_FLAG,
} from "../utils/conflict.js";
import {
  getConflictCamps,
  validateConflictGroups,
} from "../utils/conflict-groups.js";
import { rollConflictInitiative } from "../utils/conflict-initiative.js";

export class SeptarisCombatDocument extends foundry.documents.Combat {
  declare readonly groups: Collection<
    string,
    foundry.documents.CombatantGroup<foundry.documents.Combat>
  >;
  override async startCombat(): Promise<this> {
    if (this.started) {
      return this;
    }
    await rollConflictInitiative(this);
    await this.setFlag(SCOPE_FLAG, CURRENT_PHASE_FLAG, 1);
    return super.startCombat();
  }

  override async nextTurn(): Promise<this> {
    console.log("SEPTARIS | Appel à la fonction 'nextTurn'");
    if (!this.started) {
      return this;
    }

    validateConflictGroups(this);

    const currentCycle = this.round;
    const currentPhase = this.getFlag(SCOPE_FLAG, CURRENT_PHASE_FLAG) as Phase;
    const priorityCamp = this.getFlag(SCOPE_FLAG, PRIORITY_CAMP_FLAG) as string;

    if (
      currentPhase < 1 ||
      currentPhase > 4 ||
      !Number.isInteger(currentPhase)
    ) {
      throw new Error("Current phase is not valid");
    }

    if (
      !(
        typeof priorityCamp === "string" &&
        getConflictCamps(this).some((camp) => camp.id === priorityCamp)
      )
    ) {
      throw new Error("Priority Camp is not valid");
    }

    const otherCamp = getConflictCamps(this).find(
      (c) => c.id !== priorityCamp,
    )?.id;

    if (!(typeof otherCamp === "string")) {
      throw new Error("Priority Camp is not valid");
    }

    const nextPhase = getNextPhase({
      currentCycle,
      currentPhase,
      priorityCamp,
      otherCamp,
    });

    await this.update({
      round: nextPhase.nextCycle,
      "flags.septaris.currentPhase": nextPhase.nextPhase,
    });

    return this;
  }
}
