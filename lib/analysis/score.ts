import type { Finding } from "./types";

const SEVERITY_WEIGHT: Record<Finding["severity"], number> = {
  high: 1.4,
  medium: 0.8,
  low: 0.35,
};

/**
 * Deducts from a starting 10, weighted by severity, with diminishing
 * marginal impact per finding (via sqrt of count within each severity)
 * so twenty "low" hits on a big file don't zero out an otherwise decent
 * score the way twenty flat deductions would.
 */
export function computeScore(findings: Finding[]): { score: number; label: string } {
  const bySeverity: Record<Finding["severity"], number> = { high: 0, medium: 0, low: 0 };
  findings.forEach((f) => bySeverity[f.severity]++);

  let deduction = 0;
  (Object.keys(bySeverity) as Finding["severity"][]).forEach((sev) => {
    const count = bySeverity[sev];
    if (count === 0) return;
    deduction += SEVERITY_WEIGHT[sev] * Math.sqrt(count) * 1.6;
  });

  const raw = Math.max(0, Math.min(10, 10 - deduction));
  const score = Math.round(raw * 10) / 10;

  let label: string;
  if (score >= 9) label = "Excellent";
  else if (score >= 7.5) label = "Solid";
  else if (score >= 6) label = "Okay, worth a pass";
  else if (score >= 4) label = "Needs work";
  else label = "Rough shape";

  return { score, label };
}
