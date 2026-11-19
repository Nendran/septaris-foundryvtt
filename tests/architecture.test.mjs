import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../src/rules");

function allTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) return allTypeScriptFiles(full);
    return entry.isFile() && entry.name.endsWith(".ts") ? [full] : [];
  });
}

describe("Architecture — le moteur rules/ ne dépend pas de Foundry", () => {
  it("ne référence aucune API Foundry ou interface du système", () => {
    const forbidden = [
      /\b(?:foundry|game|ui|Hooks|ChatMessage|Handlebars|CONFIG)\s*\./,
      /\bnew\s+Roll\s*\(/,
      /\bSeptarisCombat\b/,
      /from\s*["'][^"']*(?:foundry\/|sheets\/|documents\/|data\/actor\/)/,
    ];
    const files = allTypeScriptFiles(root);
    assert.ok(files.length > 0, "Aucun fichier de règles trouvé");

    for (const filename of files) {
      const source = readFileSync(filename, "utf8");
      for (const expression of forbidden) {
        assert.doesNotMatch(
          source,
          expression,
          `Dépendance non autorisée dans ${filename}`,
        );
      }
    }
  });
});
