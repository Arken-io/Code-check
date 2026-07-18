# Arken · Code Check

Paste code, get an instant static review: possible bugs, slow spots,
copy-pasted blocks, and a score out of 10.

**No AI, no API key, no network call.** Every check in `lib/analysis/`
is a plain regex/line-based heuristic that runs synchronously in the
browser on the text you paste — nothing is sent anywhere. That's also
why it's not as smart as an LLM-based reviewer: it flags *patterns*
(loose equality, empty catch blocks, nested loops, repeated blocks...),
not everything a careful human or an AI agent would catch. See the
comment at the top of each file in `lib/analysis/` for exactly what it
does and doesn't detect.

## Stack

Same as Arken Compare: Next.js 14 + Tailwind + Framer Motion +
lucide-react, same dark theme and design tokens (`tailwind.config.ts`,
`app/globals.css` are copied over unchanged).

## Run locally

```
npm install
npm run dev
```

## Extending the rules

- `lib/analysis/bugs.ts` — bug-pattern checks (loose equality, empty
  catch, hardcoded secrets, off-by-one loop bounds, leftover debug
  output, etc.)
- `lib/analysis/performance.ts` — slowness heuristics (nested loops, DOM
  queries in loops, etc.)
- `lib/analysis/duplication.ts` — sliding-window repeated-block detector
- `lib/analysis/undeclared.ts` — flags identifiers used in `return`
  statements that don't match anything declared earlier in the snippet
  (params, let/const/var, function/class names, imports). Deliberately
  scoped to `return` statements only, since full undeclared-variable
  detection needs real scope analysis (nested closures, cross-file
  imports) that a regex checker can't do reliably — this is the safe
  subset with a low false-positive rate, verified against both this
  project's own source and Arken Compare's.
- `lib/analysis/score.ts` — turns findings into a 0–10 score
- `lib/analysis/index.ts` — wires the above together

Add a new check by pushing a `Finding` from any of the rule files; no
other wiring needed.

## Known limitations

This is a static, rule-based tool — no AST, no type checker, no AI. It's
built to catch *common patterns* fast and privately, not to replace a
real linter (ESLint/Ruff/etc.), a type checker, or a careful human/AI
review. In particular:

- No general "unused/undeclared variable" detection — only the narrow,
  `return`-statement-scoped check described above.
- No true control-flow or data-flow analysis, so bugs that only show up
  by tracing execution across branches won't be caught.
- Security checks are minimal (hardcoded secrets, obvious string-built
  SQL) — this is not a security scanner.
- Duplication detection is literal-text matching; renamed or reordered
  copy-paste won't be caught.
