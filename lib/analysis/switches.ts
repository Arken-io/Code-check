import type { Finding } from "./types";
import { findMatchingBraceEnd, lineNumberAt } from "./blockUtils";

/**
 * Finds every `switch (...) { ... }` block (nested or not) and checks
 * its own case labels for two things: a case value repeated within the
 * same switch, and a case whose body has code but no break/return/
 * throw before the next label (unintentional fallthrough). Nested
 * switches are masked out of the parent's body before scanning so
 * their case labels aren't attributed to the outer switch.
 */
export function findSwitchIssues(code: string, language: string): Finding[] {
  if (!["JavaScript", "TypeScript"].includes(language)) return [];

  const findings: Finding[] = [];
  const switchHeaderRe = /\bswitch\s*\([^)]*\)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = switchHeaderRe.exec(code))) {
    const braceStart = match.index + match[0].length - 1;
    const braceEnd = findMatchingBraceEnd(code, braceStart);
    const bodyStartLine = lineNumberAt(code, braceStart);
    let body = code.slice(braceStart + 1, braceEnd);
    body = maskNestedSwitches(body);
    analyzeSwitchBody(body, bodyStartLine, findings);
  }

  return findings;
}

function maskNestedSwitches(text: string): string {
  let result = "";
  let i = 0;
  const re = /\bswitch\s*\([^)]*\)\s*\{/g;
  while (i < text.length) {
    re.lastIndex = i;
    const m = re.exec(text);
    if (!m) {
      result += text.slice(i);
      break;
    }
    const braceStart = m.index + m[0].length - 1;
    const braceEnd = findMatchingBraceEnd(text, braceStart);
    result += text.slice(i, m.index);
    const span = text.slice(m.index, braceEnd + 1);
    result += span.replace(/[^\n]/g, " ");
    i = braceEnd + 1;
  }
  return result;
}

function analyzeSwitchBody(body: string, bodyStartLine: number, findings: Finding[]) {
  const labelRe = /^[ \t]*(case\s+[^:]+|default)\s*:/gm;
  const labels: { index: number; endOfLabel: number; text: string; line: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = labelRe.exec(body))) {
    const lineOffset = (body.slice(0, m.index).match(/\n/g) || []).length;
    labels.push({
      index: m.index,
      endOfLabel: m.index + m[0].length,
      text: m[1].trim(),
      line: bodyStartLine + lineOffset,
    });
  }

  const seenCaseValues = new Set<string>();
  labels.forEach((cur, idx) => {
    const segStart = cur.endOfLabel;
    const segEnd = idx + 1 < labels.length ? labels[idx + 1].index : body.length;
    const segment = body.slice(segStart, segEnd);

    if (cur.text.startsWith("case")) {
      const value = cur.text.slice(4).trim();
      if (seenCaseValues.has(value)) {
        findings.push({
          category: "bug",
          severity: "high",
          line: cur.line,
          title: "Duplicate case value",
          detail: `The value ${value} is already handled by an earlier case in this switch, so this case can never run.`,
        });
      } else {
        seenCaseValues.add(value);
      }
    }

    const hasExit = /\b(break|return|throw)\b/.test(segment);
    const meaningfulLines = segment
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !/^(\/\/|\/\*|\*)/.test(l));
    const isEmpty = meaningfulLines.length === 0;
    const isLast = idx === labels.length - 1;
    const hasFallthroughComment = /fallthrough|falls?\s*through/i.test(segment);

    if (!hasExit && !isEmpty && !isLast && !hasFallthroughComment) {
      findings.push({
        category: "bug",
        severity: "medium",
        line: cur.line,
        title: "Missing break in switch case",
        detail: "This case has code but no break, return, or throw, so execution falls through into the next case. Add a break or a comment noting the fallthrough is intentional.",
      });
    }
  });
}
