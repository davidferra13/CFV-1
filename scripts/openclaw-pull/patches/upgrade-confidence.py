#!/usr/bin/env python3
"""
Upgrade confidence checker with:
- Feedback calibration (learn from past thumbs up/down)
- JSON structure validation
- Structured output awareness
"""
import os

CHECKER = os.path.expanduser("~/openclaw-docket/confidence-checker.mjs")

c = open(CHECKER).read()

# Replace the entire function signature to accept feedbackHistory
old_sig = "export function checkConfidence(output, outputType, filesRead) {"
new_sig = "export function checkConfidence(output, outputType, filesRead, feedbackHistory = []) {"

if old_sig in c:
    c = c.replace(old_sig, new_sig)
    print("1. Updated function signature to accept feedbackHistory")

# Add calibration logic before the final confidence assignment
old_confidence_assign = """  let confidence;
  if (failures === 0) confidence = 'high';
  else if (failures === 1) confidence = 'medium';
  else confidence = 'low';

  return { confidence, reasons: checks, failures };"""

new_confidence_assign = """  // Check 5: JSON structure validation (for structured output mode)
  let parsedJson = null;
  try {
    parsedJson = JSON.parse(output);
    if (parsedJson.sections && Array.isArray(parsedJson.sections) && parsedJson.sections.length > 0) {
      checks.push('json structure: valid (' + parsedJson.sections.length + ' sections)');
    } else {
      checks.push('json structure: valid but missing sections array');
    }
  } catch {
    // Not JSON - that's ok for Ollama fallback which doesn't use json mode
    checks.push('json structure: raw markdown (no penalty)');
  }

  // Confidence calibration from feedback history
  let calibrationAdjust = 0;
  if (feedbackHistory.length >= 5) {
    const recentDown = feedbackHistory.filter(f => f.feedback === 'down').length;
    const recentUp = feedbackHistory.filter(f => f.feedback === 'up').length;
    const downRate = recentDown / feedbackHistory.length;

    if (downRate > 0.5) {
      // More than half of recent items got thumbs down - be more skeptical
      calibrationAdjust = 1;
      checks.push('calibration: high reject rate (' + Math.round(downRate * 100) + '%), confidence lowered');
    } else if (downRate === 0 && recentUp >= 5) {
      // All recent items approved - slightly more generous
      calibrationAdjust = -1;
      checks.push('calibration: perfect approval streak, confidence boosted');
    } else {
      checks.push('calibration: normal (' + recentUp + ' up, ' + recentDown + ' down)');
    }
  }

  const adjustedFailures = Math.max(0, failures + calibrationAdjust);

  let confidence;
  if (adjustedFailures === 0) confidence = 'high';
  else if (adjustedFailures === 1) confidence = 'medium';
  else confidence = 'low';

  return { confidence, reasons: checks, failures: adjustedFailures };"""

if old_confidence_assign in c:
    c = c.replace(old_confidence_assign, new_confidence_assign)
    print("2. Added JSON validation + feedback calibration")

open(CHECKER, "w").write(c)
print("\nConfidence checker upgrade complete!")
