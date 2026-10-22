export function localizeLabel(key, fallback = key) {
  const value = globalThis.game?.i18n?.localize?.(key);
  return typeof value === "string" && value && value !== key ? value : fallback;
}
