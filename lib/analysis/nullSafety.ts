import type { Finding } from "./types";

const NULLABLE_CALL =
  /\b(?:document\.getElementById|document\.querySelector|\.find|\.match|\.exec)\s*\(/;

/**
 * Flags a variable assigned from a call that commonly returns null/
 * undefined (getElementById, querySelector, .find, .match, .exec) when
 * the very next non-blank line accesses a property on it without
 * optional chaining ('?.') or a guard ('if (name...'). Only looks one
 * line ahead, the same shallow lookahead the performance checks use,
 * so a guard a few lines later, or reassignment first, isn't seen.
 */
export function findNullSafetyIssues(code: string, language: string): Finding[] {
  if (!["JavaScript", "TypeScript"].includes(language)) return [];

  const lines = code.split("\n");
  const findings: Finding[] = [];

  lines.forEach((raw, i) => {
    const line = raw;
    const assignMatch = line.match(/\b(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=.*/);
    if (!assignMatch || !NULLABLE_CALL.test(line)) return;

    const name = assignMatch[1];
    const next = (lines[i + 1] || "").trim();
    if (!next) return;

    const accessesProp = new RegExp(`^${name}\\.[a-zA-Z_$]`).test(next);
    const isOptionalChain = new RegExp(`^${name}\\?\\.`).test(next);
    const isGuarded = new RegExp(`^(if\\s*\\(\\s*!?${name}\\b|while\\s*\\(\\s*!?${name}\\b)`).test(next);

    if (accessesProp && !isOptionalChain && !isGuarded) {
      findings.push({
        category: "bug",
        severity: "medium",
        line: i + 2,
        title: `Possible null/undefined access on '${name}'`,
        detail: `'${name}' comes from a call that can return null/undefined, and is used here without a guard or '?.'. A missing element or unmatched result would throw here.`,
      });
    }
  });

  return findings;
}
