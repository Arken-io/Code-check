import type { Finding } from "./types";

const LOOP_OPENERS = [
  /\bfor\s*\(/, // C-style / JS for
  /\bfor\s+\w+\s+in\b/, // Python / for-in
  /\bwhile\s*\(/,
  /\bwhile\s+.*:/,
];

function isLoopOpener(line: string): boolean {
  return LOOP_OPENERS.some((re) => re.test(line));
}

/**
 * Tracks loop nesting depth with a naive brace/indent counter — not a
 * real parser, so it can miscount on unusual formatting. Good enough to
 * flag "loop inside a loop" as a heuristic, not a guarantee.
 */
export function findPerformanceIssues(code: string, language: string): Finding[] {
  const lines = code.split("\n");
  const findings: Finding[] = [];
  const isPy = language === "Python";

  // Track loop starts with their brace depth (JS/TS/Java/C-family) so we
  // can tell when a loop opens *inside* another still-open loop.
  let braceDepth = 0;
  const openLoopDepths: number[] = [];
  let flaggedNestedLoop = false;

  lines.forEach((raw, i) => {
    const line = raw;
    const trimmed = raw.trim();
    const lineNo = i + 1;

    if (isLoopOpener(line)) {
      const nestedInsideLoop = openLoopDepths.some((d) => braceDepth >= d);
      if (nestedInsideLoop && !flaggedNestedLoop) {
        findings.push({
          category: "performance",
          severity: "medium",
          line: lineNo,
          title: "Nested loop",
          detail: "A loop inside another loop is O(n²) or worse — fine for small inputs, worth a second look if this runs on large data.",
        });
        // One flag per file keeps this from spamming a hot nested-loop
        // block line by line; the location of the first one is enough
        // to point someone at the right spot.
        flaggedNestedLoop = true;
      }
      openLoopDepths.push(braceDepth);
    }

    if (!isPy) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      // Drop any tracked loop whose block has already closed.
      while (openLoopDepths.length && openLoopDepths[openLoopDepths.length - 1] > braceDepth) {
        openLoopDepths.pop();
      }
    }

    // --- JS / TS specific ---
    if (/\.(indexOf|includes|find)\(/.test(line) && isLoopOpener(lines[Math.max(0, i - 1)] || "")) {
      findings.push({
        category: "performance",
        severity: "low",
        line: lineNo,
        title: "Array search inside a loop",
        detail: "indexOf/includes/find scan the whole array each call — if this runs per-iteration on a large list, a Set or Map lookup is O(1) instead.",
      });
    }
    if (/\+=\s*["'`]/.test(line) && /for|while/.test(code)) {
      findings.push({
        category: "performance",
        severity: "low",
        line: lineNo,
        title: "String concatenation with +=",
        detail: "Repeated += on a string inside a loop can be quadratic in some engines — building an array and joining once is usually faster for large loops.",
      });
    }
    if (/document\.(getElementById|querySelector)/.test(line) && isLoopOpener(lines[Math.max(0, i - 1)] || "")) {
      findings.push({
        category: "performance",
        severity: "medium",
        line: lineNo,
        title: "DOM query inside a loop",
        detail: "Querying the DOM repeatedly inside a loop is expensive — cache the element(s) outside the loop.",
      });
    }

    // --- Python specific ---
    if (isPy && /\.append\(/.test(line) && /for .* in range\(len\(/.test(code)) {
      findings.push({
        category: "performance",
        severity: "low",
        line: lineNo,
        title: "'range(len(...))' loop",
        detail: "Iterating with range(len(x)) then indexing is usually slower and less readable than iterating the sequence directly (or enumerate() if you need the index).",
      });
    }
    if (/time\.sleep\(/.test(line) && openLoopDepths.length) {
      findings.push({
        category: "performance",
        severity: "medium",
        line: lineNo,
        title: "sleep() inside a loop",
        detail: "A sleep on every iteration adds up fast — double check this is really the intended polling interval.",
      });
    }

    void trimmed;
  });

  return findings;
}
