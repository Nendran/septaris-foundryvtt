export function localizeLabel(key: string, fallback: string = key) {
  const value = game?.i18n?.localize?.(key);
  return typeof value === "string" && value && value !== key ? value : fallback;
}
