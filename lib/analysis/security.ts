import type { Finding } from "./types";

/**
 * Textual heuristics for the two security smells this tool flags. Like
 * the other checkers here, these are pattern matches, not a real
 * security scanner: they'll miss anything obfuscated or split across
 * lines, and can false-positive on look-alike strings.
 */
export function findSecurityIssues(code: string): Finding[] {
  const lines = code.split("\n");
  const findings: Finding[] = [];

  lines.forEach((raw, i) => {
    const line = raw;
    const trimmed = raw.trim();
    const lineNo = i + 1;

    if (
      /password\s*=\s*["'][^"']+["']|api[_-]?key\s*=\s*["'][^"']+["']|secret\s*=\s*["'][^"']+["']/i.test(
        trimmed
      )
    ) {
      findings.push({
        category: "security",
        severity: "high",
        line: lineNo,
        title: "Hardcoded credential",
        detail: "A secret-looking value is hardcoded in source. Move it to an environment variable or secret store.",
      });
    }

    if (
      /(SELECT|INSERT|UPDATE|DELETE)[^;]*['"]\s*\+/i.test(line) ||
      /f["']\s*(SELECT|INSERT|UPDATE|DELETE)/i.test(line)
    ) {
      findings.push({
        category: "security",
        severity: "high",
        line: lineNo,
        title: "Possible SQL injection",
        detail: "Query looks like it's built with string concatenation/interpolation instead of parameterized queries.",
      });
    }
  });

  return findings;
}
