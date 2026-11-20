import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");

describe("Étape 2.1 — contrat des interfaces d'attaque", () => {
  it("les fiches PJ et PNJ proposent toutes deux le bouton Attaque", () => {
    for (const path of [
      "templates/actors/character-sheet.hbs",
      "templates/actors/npc-sheet.hbs",
    ]) {
      assert.match(source(path), /id=["']attack["']/);
    }
  });

  it("les gestionnaires PJ et PNJ transmettent le bon mode de Prouesse", () => {
    assert.match(
      source("src/sheets/character-sheet.ts"),
      /roll\(this\.document\.system,\s*true,\s*["']attack["']\)/,
    );
    assert.match(
      source("src/sheets/npc-sheet.ts"),
      /roll\(this\.document\.system,\s*false,\s*["']attack["']\)/,
    );
  });

  it("le dialogue garde le DD manuel uniquement pour le jet générique", () => {
    const template = source("templates/dialogs/roll-dialog.hbs");
    assert.match(template, /eq rollConfig\.type ['"]default['"]/);
    assert.match(template, /name=["']difficulty["']/);
  });

  it("la carte de chat distingue la Défense et indique la cible", () => {
    const template = source("templates/chat/roll.hbs");
    assert.match(template, /eq rollType ['"]attack['"]/);
    assert.match(template, /Défense/);
    assert.match(template, /defender\.name/);
  });
});
