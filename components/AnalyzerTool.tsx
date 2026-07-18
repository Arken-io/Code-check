"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  Sparkles,
  Bug,
  Gauge,
  Copy as CopyIcon,
  Check,
  Trash2,
  ShieldCheck,
  Zap,
  Files,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { analyze } from "@/lib/analysis";
import type { AnalysisResult, Finding, FindingCategory } from "@/lib/analysis/types";

const PLACEHOLDER = `function total(items) {
  var sum = 0;
  for (var i = 0; i < items.length; i++) {
    for (var j = 0; j < items.length; j++) {
      sum += items[i].price
    }
  }
  console.log(sum);
  return sum
}`;

const CATEGORY_META: Record<
  FindingCategory,
  { label: string; icon: typeof Bug; color: string }
> = {
  bug: { label: "Bugs", icon: Bug, color: "text-red-400" },
  performance: { label: "Performance", icon: Zap, color: "text-amber-400" },
  duplication: { label: "Duplication", icon: Files, color: "text-accent-soft" },
  style: { label: "Style", icon: ShieldCheck, color: "text-emerald-400" },
};

function severityDot(severity: Finding["severity"]) {
  const map = {
    high: "bg-red-400",
    medium: "bg-amber-400",
    low: "bg-ink-faint",
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${map[severity]}`} />;
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 7.5 ? "text-emerald-400" : score >= 4 ? "text-amber-400" : "text-red-400";
  const ring =
    score >= 7.5 ? "stroke-emerald-400" : score >= 4 ? "stroke-amber-400" : "stroke-red-400";
  const circumference = 2 * Math.PI * 34;
  const offset = circumference * (1 - score / 10);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" strokeWidth="7" className="stroke-border-soft" />
          <motion.circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            className={ring}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-[19px] font-bold leading-none ${color}`}>{score}</span>
          <span className="text-[10px] text-ink-faint">/ 10</span>
        </div>
      </div>
      <div>
        <div className={`text-[14px] font-semibold ${color}`}>{label}</div>
        <div className="text-[12px] text-ink-faint">Heuristic score — not a certification.</div>
      </div>
    </div>
  );
}

export function AnalyzerTool() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<FindingCategory, boolean>>({
    bug: false,
    performance: false,
    duplication: false,
    style: false,
  });

  const grouped = useMemo(() => {
    if (!result) return null;
    const groups: Record<FindingCategory, Finding[]> = {
      bug: [],
      performance: [],
      duplication: [],
      style: [],
    };
    result.findings.forEach((f) => groups[f.category].push(f));
    return groups;
  }, [result]);

  function handleAnalyze() {
    if (!code.trim()) return;
    setResult(analyze(code));
  }

  function handleClear() {
    setCode("");
    setResult(null);
  }

  async function handleCopySummary() {
    if (!result) return;
    const lines = [
      `Score: ${result.score}/10 (${result.scoreLabel})`,
      `Language: ${result.language}`,
      ...result.findings.map(
        (f) => `[${f.category}/${f.severity}] line ${f.line}: ${f.title} — ${f.detail}`
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — no-op.
    }
  }

  function toggleCollapsed(cat: FindingCategory) {
    setCollapsed((c) => ({ ...c, [cat]: !c[cat] }));
  }

  const totalFindings = result?.findings.length ?? 0;

  return (
    <MotionConfig reducedMotion="user">
      <div>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pb-10 pt-4"
        >
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1 text-[12px] font-medium text-accent-soft">
            <Sparkles size={12} />
            No AI · No API key · Nothing leaves your browser
          </div>
          <h1 className="max-w-2xl text-[2.5rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            Paste code,{" "}
            <span className="text-ink-muted">get a straight answer.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-muted">
            Bugs, slow spots, and copy-pasted blocks — flagged instantly by
            a set of plain static checks, no model in the loop. A score out
            of 10 to boot.
          </p>
        </motion.div>

        {/* Input card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl rounded-xl2 border border-border bg-surface/80 p-7 shadow-card backdrop-blur transition-shadow focus-within:shadow-glow sm:p-8"
        >
          <label className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-muted">
            <Gauge size={13} /> Your code
          </label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            className="focus-ring h-64 w-full resize-y rounded-lg border border-border bg-base px-3.5 py-3 font-mono text-[13px] leading-relaxed text-ink placeholder:text-ink-faint/60"
          />
          <div className="mt-5 flex items-center gap-2.5">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleAnalyze}
              disabled={!code.trim()}
              className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-[13.5px] font-semibold text-white transition-all hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Gauge size={15} />
              Analyze
            </motion.button>
            {(code || result) && (
              <motion.button
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClear}
                className="focus-ring flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-border px-3.5 py-3 text-[13px] font-medium text-ink-muted transition-colors hover:border-red-500/30 hover:text-red-400"
              >
                <Trash2 size={14} />
                Clear
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result && grouped && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-auto mt-10 max-w-3xl"
            >
              <div className="flex flex-col gap-5 rounded-xl2 border border-border bg-surface/60 p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
                <ScoreGauge score={result.score} label={result.scoreLabel} />
                <div className="flex flex-col items-start gap-1 text-[12.5px] text-ink-faint sm:items-end">
                  <span>
                    {result.language} · {result.lineCount} lines · {totalFindings}{" "}
                    finding{totalFindings === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="focus-ring flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-accent-soft transition-all hover:text-accent active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check size={12} /> Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon size={12} /> Copy summary
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {(Object.keys(CATEGORY_META) as FindingCategory[]).map((cat) => {
                  const items = grouped[cat];
                  if (items.length === 0) return null;
                  const meta = CATEGORY_META[cat];
                  const Icon = meta.icon;
                  const isCollapsed = collapsed[cat];
                  return (
                    <div
                      key={cat}
                      className="overflow-hidden rounded-xl2 border border-border bg-surface/60 shadow-card"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(cat)}
                        className="focus-ring flex w-full items-center justify-between px-5 py-4 text-left"
                      >
                        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                          <Icon size={15} className={meta.color} />
                          {meta.label}
                          <span className="rounded-full bg-border-soft px-1.5 py-0.5 text-[10.5px] font-medium text-ink-faint">
                            {items.length}
                          </span>
                        </span>
                        {isCollapsed ? (
                          <ChevronDown size={14} className="text-ink-faint" />
                        ) : (
                          <ChevronUp size={14} className="text-ink-faint" />
                        )}
                      </button>
                      {!isCollapsed && (
                        <div className="divide-y divide-border-soft border-t border-border-soft">
                          {items.map((f, idx) => (
                            <div key={idx} className="flex gap-3 px-5 py-3.5">
                              <span className="mt-1.5">{severityDot(f.severity)}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
                                  {f.title}
                                  {f.line > 0 && (
                                    <span className="rounded bg-border-soft px-1.5 py-0.5 font-mono text-[10.5px] text-ink-faint">
                                      line {f.line}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                                  {f.detail}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {totalFindings === 0 && (
                  <div className="rounded-xl2 border border-dashed border-border-soft px-6 py-8 text-center text-[13.5px] text-ink-faint">
                    Nothing jumped out. Doesn&apos;t guarantee bug-free — the
                    checks here are static heuristics, not a full linter or
                    test suite.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
