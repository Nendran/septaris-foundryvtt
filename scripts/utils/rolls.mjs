export const ROLL_MODES = Object.freeze({
  NORMAL: "normal",
  ADVANTAGE: "advantage",
  DISADVANTAGE: "disadvantage",
});

const DEFAULT_ROLL_MESSAGE_MODE = "public";
const EXCLUDED_ROLL_MESSAGE_MODES = new Set(["ic"]);

function getConfiguredMessageModes() {
  return globalThis.CONFIG?.ChatMessage?.modes ?? {};
}

function isRollMessageMode(value, modes = getConfiguredMessageModes()) {
  return (
    typeof value === "string" &&
    Object.hasOwn(modes, value) &&
    !EXCLUDED_ROLL_MESSAGE_MODES.has(value)
  );
}

export function getRollMessageModeChoices() {
  const modes = getConfiguredMessageModes();

  return Object.entries(modes)
    .filter(([value]) => isRollMessageMode(value, modes))
    .map(([value, mode]) => {
      const label = mode?.label ?? value;
      return {
        value,
        label: globalThis.game?.i18n?.localize?.(label) ?? label,
        icon: mode?.icon ?? "",
      };
    });
}

export function getDefaultRollMessageMode() {
  const configuredDefault = globalThis.game?.settings?.get?.(
    "core",
    "messageMode",
  );
  return normalizeRollMessageMode(configuredDefault, DEFAULT_ROLL_MESSAGE_MODE);
}

export function normalizeRollMessageMode(value, fallback) {
  const modes = getConfiguredMessageModes();
  const requestedMode = typeof value === "string" ? value : "";
  if (isRollMessageMode(requestedMode, modes)) return requestedMode;

  const fallbackMode = typeof fallback === "string" ? fallback : "";
  if (isRollMessageMode(fallbackMode, modes)) return fallbackMode;

  const configuredDefault = globalThis.game?.settings?.get?.(
    "core",
    "messageMode",
  );
  if (isRollMessageMode(configuredDefault, modes)) return configuredDefault;
  if (isRollMessageMode(DEFAULT_ROLL_MESSAGE_MODE, modes))
    return DEFAULT_ROLL_MESSAGE_MODE;

  return (
    Object.keys(modes).find((mode) => isRollMessageMode(mode, modes)) ??
    DEFAULT_ROLL_MESSAGE_MODE
  );
}

export function getRollMessageModeLabel(value) {
  const mode = normalizeRollMessageMode(value);
  const label = getConfiguredMessageModes()[mode]?.label ?? mode;
  return globalThis.game?.i18n?.localize?.(label) ?? label;
}
