import type { Finding } from "./types";

const JS_KEYWORDS = new Set([
  "if", "else", "for", "while", "do", "switch", "case", "default", "break",
  "continue", "function", "return", "var", "let", "const", "true", "false",
  "null", "undefined", "new", "typeof", "instanceof", "in", "of", "class",
  "extends", "super", "this", "try", "catch", "finally", "throw", "delete",
  "void", "yield", "async", "await", "static", "get", "set", "import",
  "export", "from", "as", "with", "debugger",
]);

const JS_GLOBALS = new Set([
  "console", "Math", "JSON", "Object", "Array", "Promise", "NaN", "Infinity",
  "parseInt", "parseFloat", "isNaN", "isFinite", "Number", "String",
  "Boolean", "RegExp", "Date", "Map", "Set", "WeakMap", "WeakSet", "Symbol",
  "Error", "TypeError", "RangeError", "SyntaxError", "fetch", "require",
  "module", "exports", "process", "window", "document", "global",
  "setTimeout", "setInterval", "clearTimeout", "clearInterval", "Buffer",
  "Proxy", "Reflect", "encodeURIComponent", "decodeURIComponent",
  "globalThis", "arguments", "structuredClone",
]);

/**
 * Collects every name this snippet declares — deliberately over-inclusive
 * (destructuring, rename-on-import, arrow params with or without
 * parens, for-loop headers) because over-declaring only *hides* a
 * potential finding, while under-declaring creates a false positive.
 * When in doubt, this errs toward silence rather than a wrong flag.
 */
function collectDeclaredNames(code: string): Set<string> {
  const names = new Set<string>();
  const addIdentifiersIn = (text: string) => {
    for (const m of text.matchAll(/[a-zA-Z_$][\w$]*/g)) names.add(m[0]);
  };

  for (const m of code.matchAll(/\b(?:let|const|var)\s+([a-zA-Z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of code.matchAll(/\b(?:let|const|var)\s*\{([^}]*)\}/g)) addIdentifiersIn(m[1]);
  for (const m of code.matchAll(/\b(?:let|const|var)\s*\[([^\]]*)\]/g)) addIdentifiersIn(m[1]);
  for (const m of code.matchAll(/\bfunction\s+([a-zA-Z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of code.matchAll(/\bclass\s+([a-zA-Z_$][\w$]*)/g)) names.add(m[1]);
  // Single-arg arrow without parens: `n => ...`
  for (const m of code.matchAll(/\b([a-zA-Z_$][\w$]*)\s*=>/g)) names.add(m[1]);
  // Parenthesized param lists: function(...), (...) =>, and for(...) headers
  // (the last is a harmless over-match — it just adds a few extra "declared"
  // names from the loop header, which can only reduce false positives).
  for (const m of code.matchAll(/\(([^()]*)\)\s*(?::\s*[^{=;\n]*)?\s*(?:=>|\{)/g)) {
    m[1].split(",").forEach((raw) => {
      const seg = raw.split("=")[0].trim();
      if (seg.startsWith("{") || seg.startsWith("[")) {
        addIdentifiersIn(seg);
      } else {
        const id = seg.match(/^\.\.\.?\s*([a-zA-Z_$][\w$]*)/) || seg.match(/^([a-zA-Z_$][\w$]*)/);
        if (id) names.add(id[1]);
      }
    });
  }
  // Named imports
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    m[1].split(",").forEach((seg) => {
      const name = seg.trim().split(/\s+as\s+/).pop();
      if (name) names.add(name.trim());
    });
  }
  for (const m of code.matchAll(/import\s+([a-zA-Z_$][\w$]*)\s*(?:,|from)/g)) names.add(m[1]);

  return names;
}

/**
 * Flags identifiers referenced in `return` statements that don't match
 * anything declared earlier in the snippet (params, let/const/var,
 * function/class names, imports). Deliberately narrow: full undeclared-
 * variable detection needs real scope analysis (nested closures, files
 * imported elsewhere, etc.), which is out of reach for a regex-based
 * checker. Return statements are where an undefined reference is both
 * common and cheap to check with low false-positive risk, so that's as
 * far as this goes — everywhere else, this checker stays silent rather
 * than guess.
 */
export function findUndeclaredReferences(code: string, language: string): Finding[] {
  if (!["JavaScript", "TypeScript"].includes(language)) return [];

  const declared = collectDeclaredNames(code);
  const lines = code.split("\n");
  const findings: Finding[] = [];
  const alreadyFlagged = new Set<string>();

  lines.forEach((line, i) => {
    const trimmedLine = line.trim();
    if (/^(\/\/|\/\*|\*|#)/.test(trimmedLine)) return;
    // Best-effort strip of a trailing "// ..." comment. Not string-literal
    // aware (a "//" inside a string would cut early), but that's a rare
    // enough shape in a return statement to accept the tradeoff.
    const codeOnly = line.split(/\/\//)[0];
    const returnMatch = codeOnly.match(/\breturn\s+(.+?);?\s*$/);
    if (!returnMatch) return;
    let expr = returnMatch[1];

    // Skip JSX returns outright — this checker has no concept of tag
    // names/attributes vs. identifiers, so it would just misfire on them.
    if (/^\(?\s*<[A-Za-z]/.test(expr)) return;

    // Strip string/template literal contents so English words or JSX-ish
    // text inside quotes never get treated as identifiers.
    expr = expr
      // Regex literals (best-effort: requires at least one char between
      // slashes, so plain division like "a / b" won't match this).
      .replace(/\/(?:\\.|[^/\\\n])+\/[a-z]*/g, "//")
      .replace(/`(?:\\.|[^`\\])*`/g, "``")
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      .replace(/'(?:\\.|[^'\\])*'/g, "''")
      // Object-literal keys ({ title: ..., detail: ... }) are declarations
      // of a property name, not a read of a variable — drop the key,
      // keep the punctuation so downstream matching still lines up.
      .replace(/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:(?!:))/g, "$1$3");

    for (const m of expr.matchAll(/(?<![.\w$])([a-zA-Z_$][\w$]*)(?=\s*(?:[^\w$(]|$))/g)) {
      const name = m[1];
      if (JS_KEYWORDS.has(name) || JS_GLOBALS.has(name) || declared.has(name)) continue;
      const key = `${i}:${name}`;
      if (alreadyFlagged.has(key)) continue;
      alreadyFlagged.add(key);
      findings.push({
        category: "bug",
        severity: "high",
        line: i + 1,
        title: `Possibly undefined variable: '${name}'`,
        detail: `'${name}' is used here but doesn't match any parameter, let/const/var, or function name declared in this snippet — check for a typo or a missing declaration.`,
      });
    }
  });

  return findings;
}
