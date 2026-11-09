import type Collection from "@common/utils/collection.mjs";
import {
  initializeActionResources,
  refreshActionResources,
} from "../utils/action-resources.js";
import {
  type ConflictState,
  CURRENT_PHASE_FLAG,
  getNextCycle,
  getNextPhase,
  getPreviousCycle,
  getPreviousPhase,
  type Phase,
  PRIORITY_CAMP_FLAG,
  SCOPE_FLAG,
} from "../utils/conflict.js";
import {
  getConflictCamps,
  validateConflictGroups,
} from "../utils/conflict-groups.js";
import { rollConflictInitiative } from "../utils/conflict-initiative.js";
import {
  createPhaseTimerState,
  PHASE_TIMER_FLAG,
} from "../utils/phase-timer.js";

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
    for (const combatant of this.combatants) {
      await initializeActionResources(combatant);
    }
    await this.setFlag(SCOPE_FLAG, CURRENT_PHASE_FLAG, 1);

    const startedCombat = await super.startCombat();

    await this.setFlag(
      SCOPE_FLAG,
      PHASE_TIMER_FLAG,
      createPhaseTimerState(1, 1),
    );

    return startedCombat;
  }

  override async nextTurn(): Promise<this> {
    const data = this.validateTurnData();

    const nextPhase = getNextPhase(data);

    await this.applyConflictTransition(
      nextPhase.nextCycle,
      nextPhase.nextPhase,
    );

    return this;
  }

  override async previousTurn(): Promise<this> {
    const data = this.validateTurnData();

    const prevPhase = getPreviousPhase(data);

    await this.applyConflictTransition(
      prevPhase.prevCycle,
      prevPhase.prevPhase,
    );

    return this;
  }

  override async nextRound(): Promise<this> {
    const data = this.validateTurnData();

    const nextPhase = getNextCycle(data);

    await this.applyConflictTransition(
      nextPhase.nextCycle,
      nextPhase.nextPhase,
    );

    return this;
  }

  override async previousRound(): Promise<this> {
    const data = this.validateTurnData();

    const prevPhase = getPreviousCycle(data);

    await this.applyConflictTransition(
      prevPhase.prevCycle,
      prevPhase.prevPhase,
    );

    return this;
  }

  validateTurnData(): ConflictState {
    if (!this.started) {
      throw new Error("Combat not started");
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

    return {
      currentCycle,
      currentPhase,
      priorityCamp,
      otherCamp,
    };
  }

  async applyConflictTransition(
    destinationCycle: number,
    destinationPhase: Phase,
  ) {
    if (
      destinationPhase < 1 ||
      destinationPhase > 4 ||
      !Number.isInteger(destinationPhase)
    ) {
      throw new Error(
        "SEPTARIS | Invalid current phase. Must be between 1 and 4.",
      );
    }
    if (destinationCycle < 1 || !Number.isInteger(destinationCycle)) {
      throw new Error(
        "SEPTARIS | Invalid current cycle. Must be a positive integer.",
      );
    }

    if (destinationCycle > this.round) {
      for (const combatant of this.combatants) {
        await refreshActionResources(combatant, destinationCycle);
      }
    }

    await this.update({
      round: destinationCycle,
      "flags.septaris.currentPhase": destinationPhase,
      [`flags.${SCOPE_FLAG}.${PHASE_TIMER_FLAG}`]: createPhaseTimerState(
        destinationCycle,
        destinationPhase,
      ),
    });
  }
}
