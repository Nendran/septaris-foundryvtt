import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const template = readFileSync(resolve(root, "templates/chat/roll.hbs"), "utf8");

describe("Étape 2.2 — affichage des dégâts", () => {
  it("affiche le total des dégâts uniquement dans la branche des attaques", () => {
    assert.match(
      template,
      /{{#if\s+\(eq rollType ['"]attack['"]\)}}[\s\S]*?Dégâts[\s\S]*?{{damage}}[\s\S]*?{{\/if}}/,
    );
  });
});
