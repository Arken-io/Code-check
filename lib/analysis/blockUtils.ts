/**
 * Tiny shared helpers for the brace-counting heuristics used across the
 * rule files. Not a real parser: doesn't know about braces inside
 * strings, template literals, regex literals, or comments, so a stray
 * '{' or '}' in one of those can throw off the count. Good enough for
 * well-formed, typically-indented pasted snippets, which is the common
 * case this tool is built for.
 */

/** Returns the index of the '}' that closes the '{' at openIndex, or the last index of the string if unmatched. */
export function findMatchingBraceEnd(text: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return text.length - 1;
}

/** Counts newlines before `index` in `text` to turn a character offset into a 1-indexed line number. */
export function lineNumberAt(text: string, index: number): number {
  let count = 0;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === "\n") count++;
  }
  return count + 1;
}
