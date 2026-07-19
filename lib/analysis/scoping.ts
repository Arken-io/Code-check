import type { Finding } from "./types";

/**
 * Two scope-related heuristics, both line/brace based rather than a
 * real scope analyzer:
 *
 *  - "used before declaration": only tracks simple, single-name
 *    `let NAME = ...` / `const NAME = ...` declarations (destructuring
 *    and multi-declarations are skipped as too easy to mis-parse), and
 *    treats the first token-boundary occurrence of NAME earlier in the
 *    file as a use-before-declare. It doesn't know about separate
 *    unrelated scopes reusing the same name, so a same-named variable
 *    in a sibling function can produce a false positive.
 *
 *  - "shadowed variable": walks brace depth to approximate a scope
 *    stack, and flags a `let/const/var NAME` that reuses a name
 *    already declared in an enclosing (still-open) scope. Same-line
 *    ordering of declarations and braces is approximated, not exact.
 */
export function findScopingIssues(code: string, language: string): Finding[] {
  if (!["JavaScript", "TypeScript"].includes(language)) return [];

  const lines = code.split("\n");
  const findings: Finding[] = [];

  // --- Used before declaration ---
  const declLine = new Map<string, number>();
  lines.forEach((raw, i) => {
    const m = raw.trim().match(/^(?:export\s+)?(?:let|const)\s+([a-zA-Z_$][\w$]*)\s*=/);
    if (m && !declLine.has(m[1])) declLine.set(m[1], i);
  });

  declLine.forEach((decIndex, name) => {
    const re = new RegExp(`\\b${name}\\b`);
    for (let i = 0; i < decIndex; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || /^(\/\/|\/\*|\*)/.test(trimmed)) continue;
      if (re.test(lines[i])) {
        findings.push({
          category: "bug",
          severity: "high",
          line: i + 1,
          title: `Possible use before declaration: '${name}'`,
          detail: `'${name}' is declared with let/const on line ${decIndex + 1} but appears to be referenced here first. With let/const this throws instead of reading 'undefined'.`,
        });
        break;
      }
    }
  });

  // --- Shadowed variables ---
  const scopeNames: Set<string>[] = [new Set()];
  lines.forEach((raw, i) => {
    const trimmed = raw.trim();
    const declMatches = [...trimmed.matchAll(/\b(?:let|const|var)\s+([a-zA-Z_$][\w$]*)\s*(?:=|;|,|\))/g)];
    for (const m of declMatches) {
      const name = m[1];
      const shadowed = scopeNames.slice(0, -1).some((s) => s.has(name));
      if (shadowed) {
        findings.push({
          category: "practice",
          severity: "medium",
          line: i + 1,
          title: `Shadowed variable: '${name}'`,
          detail: `'${name}' is already declared in an outer scope. Reusing the name here can hide the outer value and make behavior harder to follow.`,
        });
      }
      scopeNames[scopeNames.length - 1].add(name);
    }

    const opens = (raw.match(/\{/g) || []).length;
    const closes = (raw.match(/\}/g) || []).length;
    for (let k = 0; k < opens; k++) scopeNames.push(new Set());
    for (let k = 0; k < closes; k++) if (scopeNames.length > 1) scopeNames.pop();
  });

  return findings;
}
