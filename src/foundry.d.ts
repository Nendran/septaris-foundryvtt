/// <reference types="@dfreds/foundry-types" />

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
}

declare global {
  const game: foundry.Game;
  const CONFIG: SeptarisConfig;
}

export {};
