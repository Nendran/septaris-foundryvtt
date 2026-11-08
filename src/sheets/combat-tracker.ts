import type {
  ApplicationRenderContext,
  ApplicationRenderOptions,
} from "@client/applications/_module.mjs";

import { SeptarisCombatDocument } from "../documents/septaris-combat.js";
import {
  CURRENT_PHASE_FLAG,
  getActiveCamp,
  type Phase,
  PRIORITY_CAMP_FLAG,
  SCOPE_FLAG,
} from "../utils/conflict.js";
import { getConflictCamps } from "../utils/conflict-groups.js";

export class SeptarisCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
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