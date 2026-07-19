import type { Finding } from "./types";

/**
 * Two independent, cheap checks:
 *  - leftover debug output (console.log/print) left in a snippet
 *  - dead code immediately after a return/throw/break/continue
 *
 * The dead-code check only looks at the single next non-blank,
 * non-comment line after an unconditional exit. It doesn't understand
 * braces or scope, so it can misfire on unusual formatting (e.g. a
 * label or a genuinely-reachable line it mistakes for a sibling
 * statement); it deliberately treats a following '}' or a 'case'/
 * 'default' label as the normal end of a block rather than dead code.
 */
export function findQualityIssues(code: string, language: string): Finding[] {
  const lines = code.split("\n");
  const findings: Finding[] = [];

  const isJsLike = ["JavaScript", "TypeScript"].includes(language);
  const isPy = language === "Python";

  lines.forEach((raw, i) => {
    const line = raw;
    const trimmed = raw.trim();
    const lineNo = i + 1;

    if (isJsLike && /console\.(log|debug)\(/.test(line)) {
      findings.push({
        category: "quality",
        severity: "low",
        line: lineNo,
        title: "Leftover console output",
        detail: "Debug logging left in. Usually fine in dev, noisy or leaky in production.",
      });
    }

    if (isPy && /print\(/.test(trimmed)) {
      findings.push({
        category: "quality",
        severity: "low",
        line: lineNo,
        title: "Leftover print statement",
        detail: "Debug print left in. Consider a logger for anything beyond a quick script.",
      });
    }

    const exitStatement = /^(return\b[^;]*;?|throw\b[^;]*;?|break\s*;?|continue\s*;?)$/;
    if (exitStatement.test(trimmed)) {
      let j = i + 1;
      while (j < lines.length && (lines[j].trim() === "" || /^(\/\/|\/\*|\*)/.test(lines[j].trim()))) {
        j++;
      }
      if (j < lines.length) {
        const next = lines[j].trim();
        const isBlockEnd = next.startsWith("}");
        const isSwitchLabel = /^(case\b|default\s*:)/.test(next);
        if (next && !isBlockEnd && !isSwitchLabel) {
          const kind = trimmed.split(/[\s;(]/)[0];
          findings.push({
            category: "quality",
            severity: "medium",
            line: j + 1,
            title: "Unreachable code",
            detail: `This can never run: it comes right after a '${kind}' on line ${lineNo}.`,
          });
        }
      }
    }
  });

  return findings;
}
