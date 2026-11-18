export type ChatMessageMode = NonNullable<
  Parameters<typeof ChatMessage.applyMode>[1]
>;

const DEFAULT_ROLL_MESSAGE_MODE = "public" as ChatMessageMode;

const EXCLUDED_ROLL_MESSAGE_MODES = new Set<string>(["ic"]);

export function normalizeRollMessageMode(
  value: unknown,
  fallback?: string,
): ChatMessageMode {
  const modes = getConfiguredMessageModes();

  if (isRollMessageMode(value, modes)) {
    return value;
  }

  if (isRollMessageMode(fallback, modes)) {
    return fallback;
  }

  const configuredDefault = game.settings.get("core", "messageMode");

  if (isRollMessageMode(configuredDefault, modes)) {
    return configuredDefault;
  }

  if (isRollMessageMode(DEFAULT_ROLL_MESSAGE_MODE, modes)) {
    return DEFAULT_ROLL_MESSAGE_MODE;
  }

  return (
    Object.keys(modes).find((mode) => isRollMessageMode(mode, modes)) ??
    DEFAULT_ROLL_MESSAGE_MODE
  );
}

export function getRollMessageModeChoices() {
  const modes = getConfiguredMessageModes();

  return Object.entries(modes)
    .filter(([value]) => isRollMessageMode(value, modes))
    .map(([value, mode]) => {
      const label = mode.label ?? value;

      return {
        value,
        label: game.i18n.localize(label) ?? label,
        icon: mode.icon ?? "",
      };
    });
}

export function getDefaultRollMessageMode(): ChatMessageMode {
  const configuredDefault = game.settings.get("core", "messageMode");

  return normalizeRollMessageMode(configuredDefault, DEFAULT_ROLL_MESSAGE_MODE);
}

export function getRollMessageModeLabel(value: unknown): string {
  const mode = normalizeRollMessageMode(value);

  const label = getConfiguredMessageModes()[mode]?.label ?? mode;

  return game.i18n.localize(label) ?? label;
}

function getConfiguredMessageModes() {
  return CONFIG.ChatMessage.modes;
}

function isRollMessageMode(
  value: unknown,
  modes = getConfiguredMessageModes(),
): value is ChatMessageMode {
  return (
    typeof value === "string" &&
    Object.hasOwn(modes, value) &&
    !EXCLUDED_ROLL_MESSAGE_MODES.has(value)
  );
}
