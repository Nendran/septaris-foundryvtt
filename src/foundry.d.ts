/// <reference types="@dfreds/foundry-types" />

import type Collection from "@common/utils/collection.mjs";

interface SeptarisChatMessageMode {
  label?: string;
  icon?: string;
}

interface SeptarisTrackableAttributes {
  bar: string[];
  value: string[];
}

interface SeptarisConfig {
  Actor: {
    dataModels: Record<string, unknown>;
    trackableAttributes: Record<string, SeptarisTrackableAttributes>;
  };

  ChatMessage: {
    modes: Record<string, SeptarisChatMessageMode>;
  };

  Combat: {
    documentClass: typeof foundry.documents.Combat;
  };
}

declare global {
  const game: foundry.Game;
  const ui: foundry.ui;
  const CONFIG: SeptarisConfig;

  type SeptarisCombat = foundry.documents.Combat & {
    readonly groups: Collection<
      foundry.documents.CombatantGroup<foundry.documents.Combat>
    >;
  };

  type SeptarisCombatant = foundry.documents.Combatant & {
    readonly group: string | null;
  };
}
