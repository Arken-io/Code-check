import type { Finding } from "./types";

/**
 * Finds simple `let/const/var NAME = ...` and `function NAME(...)`
 * declarations, then counts how many times NAME appears elsewhere in
 * the snippet (after stripping comments and string/template contents
 * so an incidental text match doesn't count as a use). If a declared
 * name never appears again, it's flagged as unused.
 *
 * Deliberately narrow: skips destructuring, exported names (used
 * elsewhere by definition), and anything prefixed with '_' (the
 * common "intentionally unused" convention). It also can't see
 * cross-file usage, so a name exported for another module will
 * correctly never be flagged, but a name that's only used in a
 * sibling file this tool never saw would be, incorrectly.
 */
function stripStringsAndComments(code: string): string {
  return code
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

export function findUnusedDeclarations(code: string, language: string): Finding[] {
  if (!["JavaScript", "TypeScript"].includes(language)) return [];

  const lines = code.split("\n");
  const stripped = stripStringsAndComments(code);
  const findings: Finding[] = [];

  lines.forEach((raw, i) => {
    const trimmed = raw.trim();
    const lineNo = i + 1;
    if (/^export\b/.test(trimmed)) return;

    const varMatch = trimmed.match(/^(?:let|const|var)\s+([a-zA-Z_$][\w$]*)\s*=[^=]/);
    if (varMatch) {
      const name = varMatch[1];
      if (!name.startsWith("_")) {
        const occurrences = stripped.match(new RegExp(`\\b${name}\\b`, "g")) || [];
        if (occurrences.length <= 1) {
          findings.push({
            category: "quality",
            severity: "low",
            line: lineNo,
            title: `Unused variable: '${name}'`,
            detail: "Declared but never referenced again in this snippet. Safe to remove if it's not needed elsewhere.",
          });
        }
      }
    }

    const funcMatch = trimmed.match(/^function\s+([a-zA-Z_$][\w$]*)\s*\(/);
    if (funcMatch) {
      const name = funcMatch[1];
      if (!name.startsWith("_")) {
        const occurrences = stripped.match(new RegExp(`\\b${name}\\b`, "g")) || [];
        if (occurrences.length <= 1) {
          findings.push({
            category: "quality",
            severity: "low",
            line: lineNo,
            title: `Unused function: '${name}'`,
            detail: "Declared but never called in this snippet. Safe to remove if it's not needed elsewhere.",
          });
        }
      }
    }
  });

  return findings;
}
