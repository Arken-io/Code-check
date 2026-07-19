export type Severity = "high" | "medium" | "low";

export type FindingCategory = "bug" | "performance" | "security" | "quality" | "practice";

export interface Finding {
  category: FindingCategory;
  severity: Severity;
  line: number; // 1-indexed, 0 if not tied to a specific line
  title: string;
  detail: string;
}

export interface AnalysisResult {
  language: string;
  lineCount: number;
  findings: Finding[];
  score: number; // 0-10
  scoreLabel: string;
}
