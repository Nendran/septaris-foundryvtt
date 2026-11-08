import type {
  ApplicationRenderContext,
  ApplicationRenderOptions,
} from "@client/applications/_module.mjs";

import type { HandlebarsRenderOptions } from "@client/applications/api/_module.mjs";

import { SeptarisCombatDocument } from "../documents/septaris-combat.js";

import {
  CURRENT_PHASE_FLAG,
  getActiveCamp,
  type Phase,
  PRIORITY_CAMP_FLAG,
  SCOPE_FLAG,
} from "../utils/conflict.js";

import { getConflictCamps } from "../utils/conflict-groups.js";

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

          return [
            {
              ...turn,
              css,
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

    header.append(summary);
  }
}
