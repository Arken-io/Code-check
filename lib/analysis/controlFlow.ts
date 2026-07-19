import type { Finding } from "./types";

const FUNCTION_START =
  /\bfunction\s+[a-zA-Z_$][\w$]*\s*\([^)]*\)\s*\{|\b(?:const|let|var)\s+[a-zA-Z_$][\w$]*\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^={]+)?=>\s*\{|\b(?:const|let|var)\s+[a-zA-Z_$][\w$]*\s*=\s*function\s*\([^)]*\)\s*\{/;

interface FunctionFrame {
  startLine: number;
  startDepth: number;
  sawReturnValue: boolean;
  lastMeaningfulLine: string;
}

/**
 * "Inconsistent return" tracks function blocks via brace depth (same
 * naive counter style as the performance checks) and flags a function
 * that returns a value on at least one path but whose last statement
 * before its closing brace isn't a return/throw, meaning some path
 * falls through and implicitly returns undefined. Only checks the very
 * last line of the block, so an early-return pattern nested deeper
 * that still leaves a real trailing statement can be missed.
 *
 * "Infinite loop" flags while(true)/while(1)/for(;;) unless a break,
 * return, or throw appears somewhere in the loop's own block.
 */
export function findControlFlowIssues(code: string, language: string): Finding[] {
  if (!["JavaScript", "TypeScript"].includes(language)) return [];

  const lines = code.split("\n");
  const findings: Finding[] = [];

  let braceDepth = 0;
  const frames: FunctionFrame[] = [];

  lines.forEach((raw, i) => {
    const line = raw;
    const trimmed = raw.trim();
    const isComment = /^(\/\/|\/\*|\*)/.test(trimmed);
    const isPureClose = /^[)}\];,]*$/.test(trimmed);

    if (trimmed && !isComment && !isPureClose) {
      frames.forEach((f) => (f.lastMeaningfulLine = trimmed));
    }

    if (FUNCTION_START.test(line)) {
      frames.push({ startLine: i + 1, startDepth: braceDepth, sawReturnValue: false, lastMeaningfulLine: "" });
    }

    if (/^return\s+\S/.test(trimmed)) {
      if (frames.length) frames[frames.length - 1].sawReturnValue = true;
    }

    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    braceDepth += opens - closes;

    while (frames.length && braceDepth <= frames[frames.length - 1].startDepth) {
      const f = frames.pop()!;
      if (f.sawReturnValue) {
        const endsClean = /^(return\b|throw\b)/.test(f.lastMeaningfulLine);
        if (!endsClean) {
          findings.push({
            category: "bug",
            severity: "medium",
            line: f.startLine,
            title: "Inconsistent return",
            detail: "This function returns a value on some paths but appears to fall through on others, which yields 'undefined' unexpectedly.",
          });
        }
      }
    }
  });

  // --- Infinite loops ---
  let depth = 0;
  const infiniteOpeners: { line: number; startDepth: number; hasExit: boolean }[] = [];

  lines.forEach((raw, i) => {
    const line = raw;

    if (/\bwhile\s*\(\s*(true|1)\s*\)/.test(line) || /\bfor\s*\(\s*;\s*;\s*\)/.test(line)) {
      infiniteOpeners.push({ line: i + 1, startDepth: depth, hasExit: false });
    }

    if (infiniteOpeners.length && /\b(break|return|throw)\b/.test(line)) {
      infiniteOpeners[infiniteOpeners.length - 1].hasExit = true;
    }

    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    depth += opens - closes;

    while (infiniteOpeners.length && depth <= infiniteOpeners[infiniteOpeners.length - 1].startDepth) {
      const loop = infiniteOpeners.pop()!;
      if (!loop.hasExit) {
        findings.push({
          category: "bug",
          severity: "medium",
          line: loop.line,
          title: "Infinite loop without visible exit",
          detail: "No break, return, or throw found inside this loop's block, so it may never terminate.",
        });
      }
    }
  });

  return findings;
}
