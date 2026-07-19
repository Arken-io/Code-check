import type { Finding } from "./types";

/**
 * Every check here is a cheap textual heuristic, not a real parser: it
 * flags *patterns worth a human look*, not proven defects. Kept
 * deliberately simple (no AST) so it runs instantly on any pasted
 * snippet in any of the languages we claim to support, at the cost of
 * occasional false positives/negatives. That tradeoff is stated in the
 * UI itself (see AnalyzerTool's disclaimer), not just here.
 */
export function findBugPatterns(code: string, language: string): Finding[] {
  const lines = code.split("\n");
  const findings: Finding[] = [];

  const isJsLike = ["JavaScript", "TypeScript"].includes(language);
  const isPy = language === "Python";

  lines.forEach((raw, i) => {
    const line = raw;
    const trimmed = raw.trim();
    const lineNo = i + 1;

    if (/\bcatch\s*\([^)]*\)\s*\{\s*\}/.test(line) || /except.*:\s*pass\s*$/.test(trimmed)) {
      findings.push({
        category: "bug",
        severity: "high",
        line: lineNo,
        title: "Empty catch block",
        detail: "Errors are being silently swallowed. Failures here won't surface anywhere.",
      });
    }

    // --- Off-by-one loop bounds (JS/TS-style C for-loops) ---
    if (/for\s*\([^;]*;\s*[\w$]+\s*<=\s*[\w$.\[\]]+\.length\s*;/.test(line)) {
      findings.push({
        category: "bug",
        severity: "high",
        line: lineNo,
        title: "Off-by-one loop bound (<= .length)",
        detail: "Looping while i <= array.length reads one index past the end: array[length] is undefined. Use '<' unless reading past the end is genuinely intended.",
      });
    }
    if (
      /for\s*\(\s*[\w$]+\s*=\s*[\w$.\[\]]+\.length\s*;/.test(line) &&
      /[\w$]+\s*>=\s*0/.test(line)
    ) {
      findings.push({
        category: "bug",
        severity: "high",
        line: lineNo,
        title: "Off-by-one loop bound (starts at .length)",
        detail: "Starting the index at array.length means the first access is array[length], which is undefined. Start at 'length - 1' instead.",
      });
    }

    // --- JS / TS ---
    if (isJsLike) {
      if (/[^=!<>]==[^=]/.test(line) && !/===/.test(line)) {
        findings.push({
          category: "bug",
          severity: "medium",
          line: lineNo,
          title: "Dangerous equality (==)",
          detail: "Use === / !== to avoid type-coercion surprises (e.g. '' == 0 is true).",
        });
      }
      if (/\.then\(/.test(line) && !/\.catch\(/.test(code)) {
        findings.push({
          category: "bug",
          severity: "medium",
          line: lineNo,
          title: "Promise without .catch",
          detail: "An unhandled promise rejection here can crash a Node process or fail silently in the browser.",
        });
      }
      if (
        (/if\s*\(.*=[^=].*\)/.test(line) || /while\s*\(.*=[^=].*\)/.test(line)) &&
        !/==/.test(line)
      ) {
        findings.push({
          category: "bug",
          severity: "high",
          line: lineNo,
          title: "Assignment in condition",
          detail: "This looks like '=' (assignment) inside an 'if'/'while' condition rather than '==' / '===' (comparison).",
        });
      }
    }

    // --- Python ---
    if (isPy) {
      if (/^\s*except\s*:\s*$/.test(line)) {
        findings.push({
          category: "bug",
          severity: "medium",
          line: lineNo,
          title: "Bare except",
          detail: "Catches every exception including KeyboardInterrupt/SystemExit. Catch a specific exception type instead.",
        });
      }
      if (/def\s+\w+\([^)]*=\s*(\[\]|\{\})/.test(line)) {
        findings.push({
          category: "bug",
          severity: "high",
          line: lineNo,
          title: "Mutable default argument",
          detail: "Default list/dict arguments are shared across all calls in Python. Use None and create the value inside the function.",
        });
      }
    }
  });

  return findings;
}
