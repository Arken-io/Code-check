import type { Finding } from "./types";

/**
 * Every check here is a cheap textual heuristic, not a real parser — it
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

    // --- Cross-language ---
    if (/\bTODO\b|\bFIXME\b|\bXXX\b/.test(trimmed)) {
      findings.push({
        category: "bug",
        severity: "low",
        line: lineNo,
        title: "Unresolved TODO/FIXME",
        detail: "Leftover marker suggests known-incomplete or known-broken logic.",
      });
    }

    if (/password\s*=\s*["'][^"']+["']|api[_-]?key\s*=\s*["'][^"']+["']|secret\s*=\s*["'][^"']+["']/i.test(trimmed)) {
      findings.push({
        category: "bug",
        severity: "high",
        line: lineNo,
        title: "Hardcoded credential",
        detail: "A secret-looking value is hardcoded in source. Move it to an environment variable or secret store.",
      });
    }

    if (/\bcatch\s*\([^)]*\)\s*\{\s*\}/.test(line) || /except.*:\s*pass\s*$/.test(trimmed)) {
      findings.push({
        category: "bug",
        severity: "high",
        line: lineNo,
        title: "Empty error handler",
        detail: "Errors are being silently swallowed — failures here won't surface anywhere.",
      });
    }

    // --- JS / TS ---
    if (isJsLike) {
      if (/[^=!<>]==[^=]/.test(line) && !/===/.test(line)) {
        findings.push({
          category: "bug",
          severity: "medium",
          line: lineNo,
          title: "Loose equality (==)",
          detail: "Use === / !== to avoid type-coercion surprises (e.g. '' == 0 is true).",
        });
      }
      if (/console\.(log|debug)\(/.test(line)) {
        findings.push({
          category: "bug",
          severity: "low",
          line: lineNo,
          title: "Leftover console output",
          detail: "Debug logging left in — usually fine in dev, noisy or leaky in production.",
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
      if (/\bvar\s+\w/.test(line)) {
        findings.push({
          category: "bug",
          severity: "low",
          line: lineNo,
          title: "'var' declaration",
          detail: "'var' is function-scoped and hoisted, which is a common source of bugs — prefer 'let'/'const'.",
        });
      }
      if (/if\s*\(.*=[^=].*\)/.test(line) && !/==/.test(line)) {
        findings.push({
          category: "bug",
          severity: "high",
          line: lineNo,
          title: "Possible assignment in condition",
          detail: "This looks like '=' (assignment) inside an 'if' condition rather than '==' / '===' (comparison).",
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
          detail: "Catches every exception including KeyboardInterrupt/SystemExit — catch a specific exception type instead.",
        });
      }
      if (/def\s+\w+\([^)]*=\s*(\[\]|\{\})/.test(line)) {
        findings.push({
          category: "bug",
          severity: "high",
          line: lineNo,
          title: "Mutable default argument",
          detail: "Default list/dict arguments are shared across all calls in Python — use None and create the value inside the function.",
        });
      }
      if (/print\(/.test(trimmed)) {
        findings.push({
          category: "bug",
          severity: "low",
          line: lineNo,
          title: "Leftover print statement",
          detail: "Debug print left in — consider a logger for anything beyond a quick script.",
        });
      }
    }

    // --- SQL injection smell (any language) ---
    if (/(SELECT|INSERT|UPDATE|DELETE)[^;]*['"]\s*\+/i.test(line) || /f["']\s*(SELECT|INSERT|UPDATE|DELETE)/i.test(line)) {
      findings.push({
        category: "bug",
        severity: "high",
        line: lineNo,
        title: "Possible SQL injection",
        detail: "Query looks like it's built with string concatenation/interpolation instead of parameterized queries.",
      });
    }
  });

  return findings;
}
