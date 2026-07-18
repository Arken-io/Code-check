const EXTENSION_MAP: Record<string, string> = {
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  py: "Python",
  java: "Java",
  cs: "C#",
  cpp: "C++",
  cc: "C++",
  c: "C",
  go: "Go",
  rb: "Ruby",
  php: "PHP",
  rs: "Rust",
  sql: "SQL",
};

/**
 * Best-effort language guess. If a filename with a known extension is
 * given, trust it. Otherwise fall back to a few cheap keyword/syntax
 * signals — good enough to pick which rule set to lean on, not meant to
 * be a real language classifier.
 */
export function detectLanguage(code: string, filename?: string): string {
  if (filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext && EXTENSION_MAP[ext]) return EXTENSION_MAP[ext];
  }

  const sample = code.slice(0, 4000);

  if (/^\s*def\s+\w+\(.*\):/m.test(sample) || /^\s*import\s+\w+\s*$/m.test(sample) && /:\s*$/m.test(sample)) {
    return "Python";
  }
  if (/^\s*(public|private|protected)\s+(static\s+)?(class|void|int|String)\b/m.test(sample)) {
    return "Java";
  }
  if (/^\s*func\s+\w+\(/m.test(sample) && /package\s+main/.test(sample)) {
    return "Go";
  }
  if (/:\s*(string|number|boolean|any)\b/.test(sample) || /\binterface\s+\w+\s*\{/.test(sample)) {
    return "TypeScript";
  }
  if (/\b(const|let|var)\s+\w+\s*=/.test(sample) || /=>\s*\{/.test(sample) || /require\(/.test(sample)) {
    return "JavaScript";
  }
  if (/^\s*SELECT\s+/im.test(sample)) {
    return "SQL";
  }
  return "Unknown";
}
