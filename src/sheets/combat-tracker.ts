import type {
  ApplicationRenderContext,
  ApplicationRenderOptions,
} from "@client/applications/_module.mjs";

import type { HandlebarsRenderOptions } from "@client/applications/api/_module.mjs";

import { SeptarisCombatDocument } from "../documents/septaris-combat.js";
import {
  consumeActionResource,
  getActionResources,
  restoreActionResource,
} from "../utils/action-resources.js";

import {
  CURRENT_PHASE_FLAG,
  getActiveCamp,
  type Phase,
  PRIORITY_CAMP_FLAG,
  RESOURCES_ACTION_FLAG,
  SCOPE_FLAG,
} from "../utils/conflict.js";

import { getConflictCamps } from "../utils/conflict-groups.js";

import {
  createPhaseTimerState,
  getPhaseTimerState,
  getRemainingTimeMs,
  isPlayerPhase,
  type PhaseTimerState,
  updatePhaseTimer,
} from "../utils/phase-timer.js";

type TrackerActionResources = Pick<
  ReturnType<typeof getActionResources>,
  "major" | "minor" | "movement" | "reaction"
>;

interface TrackerTurn {
  id: string;
  name: string;
  img: string;
  css?: string;
  hidden?: boolean;
  isDefeated?: boolean;
  isOwner?: boolean;
  initiative?: number | null;
  canPing?: boolean;
  effects?: {
    icons: {
      img: string;
      name: string;
    }[];
  };
  resources?: TrackerActionResources;
}

interface TrackerCamp {
  id: string;
  name: string;
  active: boolean;
  priority: boolean;
  members: TrackerTurn[];
}

interface SeptarisTrackerContext extends ApplicationRenderContext {
  turns?: TrackerTurn[];
  septarisCamps?: TrackerCamp[];
}

export class SeptarisCombatTracker extends foundry.applications.sidebar.tabs
  .CombatTracker {
  static override PARTS = {
    ...super.PARTS,

    tracker: {
      ...super.PARTS.tracker,
      template: "systems/septaris/templates/combat/tracker.hbs",
    },
  };

  static override DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    actions: {
      ...super.DEFAULT_OPTIONS.actions,
      toggleActionResource: this.#handleToggleActionResource,
      editPhaseTimer: this.#handlePhaseTimerAction,
    },
  };

  private phaseTimerInterval: ReturnType<typeof setInterval> | null = null;

  private stopPhaseTimerInterval(): void {
    if (this.phaseTimerInterval !== null) {
      clearInterval(this.phaseTimerInterval);
      this.phaseTimerInterval = null;
    }
  }

  private formatPhaseTimer(milliseconds: number): string {
    const seconds = Math.ceil(milliseconds / 1000);

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  protected override async _prepareTrackerContext(
    context: ApplicationRenderContext,
    options: HandlebarsRenderOptions,
  ): Promise<void> {
    await super._prepareTrackerContext(context, options);

    const trackerContext = context as SeptarisTrackerContext;

    trackerContext.septarisCamps = undefined;

    const combat = this.viewed;

    if (!(combat instanceof SeptarisCombatDocument)) return;
    if (!combat.started) return;

    const phase = combat.getFlag(SCOPE_FLAG, CURRENT_PHASE_FLAG);

    const priorityCamp = combat.getFlag(SCOPE_FLAG, PRIORITY_CAMP_FLAG);

    if (
      typeof phase !== "number" ||
      !Number.isInteger(phase) ||
      phase < 1 ||
      phase > 4 ||
      typeof priorityCamp !== "string"
    ) {
      return;
    }

    const camps = getConflictCamps(combat);

    if (camps.length !== 2) return;

    const otherCamp = camps.find((camp) => camp.id !== priorityCamp);

    if (!otherCamp || !camps.some((camp) => camp.id === priorityCamp)) {
      return;
    }

    const activeCampId = getActiveCamp({
      currentPhase: phase as Phase,
      priorityCamp,
      otherCamp: otherCamp.id,
    });

    // On utilise uniquement les combattants déjà
    // préparés et autorisés par Foundry.
    const visibleTurns = new Map(
      (trackerContext.turns ?? []).map((turn) => [turn.id, turn]),
    );

    // Le camp prioritaire est toujours affiché en premier.
    const orderedCamps = [...camps].sort((a, b) => {
      if (a.id === priorityCamp) return -1;
      if (b.id === priorityCamp) return 1;
      return 0;
    });

    trackerContext.septarisCamps = orderedCamps
      .map((camp): TrackerCamp => {
        const members = camp.members.flatMap((member) => {
          const turn = visibleTurns.get(member.id);

          if (!turn) return [];

          // Suppression de l'indicateur de tour individuel.
          // Les autres classes natives sont conservées.
          const css = (turn.css ?? "")
            .split(/\s+/)
            .filter((value) => value && value !== "active")
            .join(" ");

          let resources: TrackerActionResources | undefined;

          // Les ressources sont visibles par le MJ
          // et par les propriétaires du combattant.
          if (game.user?.isGM || turn.isOwner) {
            const combatant = combat.combatants.get(member.id);

            if (
              combatant &&
              combatant.getFlag(SCOPE_FLAG, RESOURCES_ACTION_FLAG) !== undefined
            ) {
              try {
                const { major, minor, movement, reaction } =
                  getActionResources(combatant);

                resources = {
                  major,
                  minor,
                  movement,
                  reaction,
                };
              } catch (error) {
                console.error(
                  `SEPTARIS | Invalid resources for ${combatant.name}`,
                  error,
                );
              }
            }
          }

          return [
            {
              ...turn,
              css,
              resources,
            },
          ];
        });

        return {
          id: camp.id,
          name: camp.name,
          active: camp.id === activeCampId,
          priority: camp.id === priorityCamp,
          members,
        };
      })
      // Ne pas exposer un camp entièrement invisible
      // aux joueurs non MJ.
      .filter((camp) => game.user?.isGM || camp.members.length > 0);
  }

  override async _onRender(
    context: ApplicationRenderContext,
    options: ApplicationRenderOptions,
  ): Promise<void> {
    await super._onRender(context, options);
    this.stopPhaseTimerInterval();

    this.element.querySelector(".septaris-conflict-header")?.remove();

    const combat = this.viewed;

    if (!(combat instanceof SeptarisCombatDocument)) return;
    if (!combat.started) return;

    const phase = combat.getFlag(SCOPE_FLAG, CURRENT_PHASE_FLAG);
    const priorityCamp = combat.getFlag(SCOPE_FLAG, PRIORITY_CAMP_FLAG);

    if (
      typeof phase !== "number" ||
      !Number.isInteger(phase) ||
      phase < 1 ||
      phase > 4 ||
      typeof priorityCamp !== "string"
    ) {
      return;
    }

    const camps = getConflictCamps(combat);
    if (camps.length !== 2) return;

    const otherCamp = camps.find((camp) => camp.id !== priorityCamp);
    if (!otherCamp || !camps.some((camp) => camp.id === priorityCamp)) {
      return;
    }

    const activeCampId = getActiveCamp({
      currentPhase: phase as Phase,
      priorityCamp,
      otherCamp: otherCamp.id,
    });

    const activeCamp = camps.find((camp) => camp.id === activeCampId);
    if (!activeCamp) return;

    const header = this.element.querySelector<HTMLElement>(
      '[data-application-part="header"], .combat-tracker-header',
    );

    if (!header) return;

    const summary = document.createElement("section");
    summary.className = "septaris-conflict-header";

    const title = document.createElement("h3");
    title.textContent = "Conflit Septaris";
    summary.append(title);

    const indicators = document.createElement("div");
    indicators.className = "septaris-conflict-indicators";

    for (const [label, value] of [
      ["Cycle", String(combat.round)],
      ["Phase", `${phase} / 4`],
    ]) {
      const indicator = document.createElement("div");
      indicator.className = "septaris-conflict-indicator";

      const labelElement = document.createElement("span");
      labelElement.textContent = label;

      const valueElement = document.createElement("strong");
      valueElement.textContent = value;

      indicator.append(labelElement, valueElement);
      indicators.append(indicator);
    }

    summary.append(indicators);

    const phases = document.createElement("div");
    phases.className = "septaris-conflict-phases";

    for (let i = 1; i <= 4; i++) {
      const phaseElement = document.createElement("span");
      phaseElement.textContent = String(i);

      if (i === phase) {
        phaseElement.classList.add("active");
      }

      phases.append(phaseElement);
    }

    summary.append(phases);

    const campElement = document.createElement("div");
    campElement.className = "septaris-conflict-active-camp";
    campElement.textContent = `Camp actif : ${activeCamp.name}`;

    summary.append(campElement);

    // Chronomètre uniquement pendant les phases des joueurs.
    if (isPlayerPhase(combat)) {
      const timerContainer = document.createElement("section");
      timerContainer.className = "septaris-phase-timer";

      const timerDisplay = document.createElement("strong");
      timerDisplay.className = "septaris-phase-timer-display";

      const timerStatus = document.createElement("span");
      timerStatus.className = "septaris-phase-timer-status";

      timerContainer.append(timerDisplay, timerStatus);

      let toggleButton: HTMLButtonElement | null = null;

      // Seul le MJ peut contrôler le chronomètre.
      if (game.user?.isGM) {
        const controls = document.createElement("div");
        controls.className = "septaris-phase-timer-controls";

        toggleButton = document.createElement("button");
        toggleButton.type = "button";
        toggleButton.dataset.action = "editPhaseTimer";
        toggleButton.dataset.timerCommand = "toggle";

        const resetButton = document.createElement("button");
        resetButton.type = "button";
        resetButton.dataset.action = "editPhaseTimer";
        resetButton.dataset.timerCommand = "reset";
        resetButton.textContent = "Réinitialiser";

        controls.append(toggleButton, resetButton);
        timerContainer.append(controls);
      }

      summary.append(timerContainer);

      const updateDisplay = () => {
        if (!this.rendered || !timerDisplay.isConnected) {
          this.stopPhaseTimerInterval();
          return;
        }

        const currentCombat = this.viewed;

        if (!(currentCombat instanceof SeptarisCombatDocument)) {
          return;
        }

        const currentPhase = currentCombat.getFlag(
          SCOPE_FLAG,
          CURRENT_PHASE_FLAG,
        );

        const savedState = getPhaseTimerState(currentCombat);

        const state: PhaseTimerState =
          savedState?.cycle === currentCombat.round &&
          savedState.phase === currentPhase
            ? savedState
            : createPhaseTimerState(currentCombat.round, currentPhase as Phase);

        const remainingMs = getRemainingTimeMs(state);

        timerDisplay.textContent = this.formatPhaseTimer(remainingMs);

        const expired = remainingMs <= 0;
        const running = state.startedAt !== null && !expired;

        timerContainer.classList.toggle("is-expired", expired);
        timerContainer.classList.toggle("is-running", running);

        if (expired) {
          timerStatus.textContent = "Temps écoulé";
        } else if (running) {
          timerStatus.textContent = "En cours";
        } else {
          timerStatus.textContent = "En pause";
        }

        if (toggleButton) {
          toggleButton.textContent = running ? "Pause" : "Démarrer";
          toggleButton.disabled = expired;
        }
      };

      header.append(summary);

      // Actualisation locale : aucune écriture réseau.
      this.phaseTimerInterval = setInterval(updateDisplay, 500);

      updateDisplay();
    } else {
      header.append(summary);
    }
  }

  static async #handleToggleActionResource(
    this: SeptarisCombatTracker,
    event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    // biome-ignore lint/complexity/noThisInStatic: Foundry ApplicationV2 binds `this` to the application instance.
    const combat = this.viewed;

    if (!(combat instanceof SeptarisCombatDocument)) return;
    if (!combat.started) return;

    const combatantId = target.closest<HTMLElement>("[data-combatant-id]")
      ?.dataset.combatantId;

    const resource = target.dataset.resource;

    if (!combatantId) return;

    if (
      resource !== "major" &&
      resource !== "minor" &&
      resource !== "movement" &&
      resource !== "reaction"
    ) {
      throw new Error("SEPTARIS | Invalid action resource");
    }

    const combatant = combat.combatants.get(combatantId);
    if (!combatant) return;

    const user = game.user;
    if (!user) return;

    // Le MJ peut modifier tous les combattants.
    // Un joueur doit posséder le combattant.
    if (!user.isGM && !combatant.isOwner) {
      ui.notifications.warn(
        "Vous ne pouvez pas modifier les ressources de ce combattant.",
      );
      return;
    }

    if (!combatant.canUserModify(user, "update")) {
      ui.notifications.warn(
        "Vous ne disposez pas des permissions nécessaires.",
      );
      return;
    }

    const button = target instanceof HTMLButtonElement ? target : null;

    if (button?.disabled) return;
    if (button) button.disabled = true;

    try {
      const resources = getActionResources(combatant);

      if (resources[resource] > 0) {
        await consumeActionResource(combatant, resource);
      } else {
        await restoreActionResource(combatant, resource);
      }
    } catch (error) {
      console.error("SEPTARIS | Action resource error:", error);

      ui.notifications.error(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      if (button) button.disabled = false;
    }
  }

  static async #handlePhaseTimerAction(
    this: SeptarisCombatTracker,
    event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    // biome-ignore lint/complexity/noThisInStatic: Foundry binds this to the application.
    const combat = this.viewed;

    if (!(combat instanceof SeptarisCombatDocument)) return;
    if (!game.user?.isGM) return;

    const action = target.dataset.timerCommand;

    if (action !== "toggle" && action !== "reset") {
      return;
    }

    const button = target instanceof HTMLButtonElement ? target : null;

    if (button?.disabled) return;
    if (button) button.disabled = true;

    try {
      await updatePhaseTimer(combat, action);
    } catch (error) {
      console.error("SEPTARIS | Phase timer error:", error);

      ui.notifications.error(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      if (button) button.disabled = false;
    }
  }
}
