import type { Finding } from "./types";

const MIN_BLOCK_LINES = 4;

function normalize(line: string): string {
  return line.trim().replace(/\s+/g, " ");
}

/**
 * Finds repeated blocks of MIN_BLOCK_LINES+ consecutive non-trivial
 * lines using a sliding window over the normalized source — a simple
 * substring-repeat check, not a semantic clone detector. It won't catch
 * copy-paste that was renamed/reordered, but it reliably catches literal
 * copy-paste, which is the common case worth flagging.
 */
export function findDuplication(code: string): Finding[] {
  const rawLines = code.split("\n");
  const normalized = rawLines.map(normalize);

  // Lines that are blank, a lone brace, or a comment-only line are too
  // common to be meaningful signal — skip windows anchored on them so we
  // don't report "duplication" that's just matching whitespace patterns.
  const isTrivial = (l: string) =>
    l.length === 0 || /^[{}();]*$/.test(l) || /^(\/\/|#|\*|\/\*)/.test(l);

  const seen = new Map<string, number>(); // block signature -> first start line (0-indexed)
  const reportedStarts = new Set<number>();
  const findings: Finding[] = [];

  for (let start = 0; start <= normalized.length - MIN_BLOCK_LINES; start++) {
    if (isTrivial(normalized[start])) continue;
    const block = normalized.slice(start, start + MIN_BLOCK_LINES);
    if (block.every(isTrivial)) continue;
    const signature = block.join("\n");

    const firstStart = seen.get(signature);
    if (firstStart === undefined) {
      seen.set(signature, start);
    } else if (!reportedStarts.has(start)) {
      reportedStarts.add(start);
      findings.push({
        category: "duplication",
        severity: "medium",
        line: start + 1,
        title: `Repeated block (${MIN_BLOCK_LINES}+ lines)`,
        detail: `This matches a block starting at line ${firstStart + 1}. Consider extracting a shared function.`,
      });
    }
  }

  return findings;
}
