import type { Finding } from "./types";

/**
 * Style/convention nudges rather than defects: the code will run fine
 * either way, but these patterns tend to cause friction or confusion
 * down the line.
 */
export function findBestPracticeIssues(code: string, language: string): Finding[] {
  const lines = code.split("\n");
  const findings: Finding[] = [];
  const isJsLike = ["JavaScript", "TypeScript"].includes(language);

  lines.forEach((raw, i) => {
    const line = raw;
    const trimmed = raw.trim();
    const lineNo = i + 1;

    if (/\bTODO\b|\bFIXME\b|\bXXX\b/.test(trimmed)) {
      findings.push({
        category: "practice",
        severity: "low",
        line: lineNo,
        title: "Unresolved TODO/FIXME",
        detail: "Leftover marker suggests known-incomplete or known-broken logic.",
      });
    }

    if (isJsLike && /\bvar\s+\w/.test(line)) {
      findings.push({
        category: "practice",
        severity: "low",
        line: lineNo,
        title: "'var' declaration",
        detail: "'var' is function-scoped and hoisted, which is a common source of bugs. Prefer 'let'/'const'.",
      });
    }
  });

  return findings;
}
