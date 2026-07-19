import type { AnalysisResult } from "./types";
import { detectLanguage } from "./detectLanguage";
import { findBugPatterns } from "./bugs";
import { findPerformanceIssues } from "./performance";
import { findDuplication } from "./duplication";
import { findUndeclaredReferences } from "./undeclared";
import { findSecurityIssues } from "./security";
import { findQualityIssues } from "./quality";
import { findUnusedDeclarations } from "./unused";
import { findBestPracticeIssues } from "./bestPractices";
import { findScopingIssues } from "./scoping";
import { findControlFlowIssues } from "./controlFlow";
import { findSwitchIssues } from "./switches";
import { findNullSafetyIssues } from "./nullSafety";
import { computeScore } from "./score";

/**
 * Runs entirely on the pasted text, synchronously, in the browser. No
 * network call, no AI model, no API key: every finding below comes from
 * a regex/line-based heuristic in this folder, not a judgment call from
 * a language model. See each rule file's own comment for what it does
 * and doesn't catch.
 */
export function analyze(code: string, filename?: string): AnalysisResult {
  const language = detectLanguage(code, filename);
  const lineCount = code.split("\n").length;

  const findings = [
    ...findBugPatterns(code, language),
    ...findPerformanceIssues(code, language),
    ...findDuplication(code),
    ...findUndeclaredReferences(code, language),
    ...findSecurityIssues(code),
    ...findQualityIssues(code, language),
    ...findUnusedDeclarations(code, language),
    ...findBestPracticeIssues(code, language),
    ...findScopingIssues(code, language),
    ...findControlFlowIssues(code, language),
    ...findSwitchIssues(code, language),
    ...findNullSafetyIssues(code, language),
  ].sort((a, b) => a.line - b.line);

  const { score, label } = computeScore(findings);

  return { language, lineCount, findings, score, scoreLabel: label };
}
