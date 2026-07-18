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

- `lib/analysis/bugs.ts` — bug-pattern checks
- `lib/analysis/performance.ts` — slowness heuristics (nested loops, DOM
  queries in loops, etc.)
- `lib/analysis/duplication.ts` — sliding-window repeated-block detector
- `lib/analysis/score.ts` — turns findings into a 0–10 score
- `lib/analysis/index.ts` — wires the above together

Add a new check by pushing a `Finding` from any of the rule files; no
other wiring needed.
