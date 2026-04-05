#!/usr/bin/env python3
"""
Upgrade docket processor with state-of-the-art features:
1. Structured JSON output from Groq
2. Prompt caching optimization (static prefix first)
3. Confidence calibration (learn from feedback)
"""
import os

PROCESSOR = os.path.expanduser("~/openclaw-docket/processor.mjs")

c = open(PROCESSOR).read()

# === 1. STRUCTURED JSON OUTPUT ===
# Add response_format to Groq call for guaranteed parseable output

old_groq_body = """const body = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 8192,
  });"""

new_groq_body = """const body = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  });"""

if old_groq_body in c:
    c = c.replace(old_groq_body, new_groq_body)
    print("1. Added response_format: json_object to Groq call")
else:
    print("1. SKIP: Groq body not found (already patched?)")

# === 2. PROMPT CACHING OPTIMIZATION ===
# Move static content to system prompt (cached by Groq automatically)
# Move dynamic content to user prompt
# Groq caches exact prefix matches, so system prompt = stable = cached

old_system = """const systemPrompt = `You are a ChefFlow planning agent. You produce high-quality planning documents for a Next.js food services application.

RULES:
- Reference real file paths from the codebase context provided
- Be specific about what code to change and where
- Never use em dashes (use commas, semicolons, or parentheses instead)
- Follow the output format exactly
- Include "## What This Does" and "## Why It Matters" sections for specs
- For bug reports, include root cause analysis and recommended fix
- Include real file paths and line references from the context`;"""

new_system = """const systemPrompt = `You are a ChefFlow planning agent. You produce high-quality planning documents for a Next.js food services application.

RULES:
- Reference real file paths from the codebase context provided
- Be specific about what code to change and where
- Never use em dashes (use commas, semicolons, or parentheses instead)
- Include real file paths and line references from the context
- For bug reports, include root cause analysis and recommended fix

IMPORTANT: You MUST respond with valid JSON. Your response must be a JSON object with these fields:
{
  "title": "string - document title",
  "summary": "string - one paragraph summary",
  "sections": [
    { "heading": "string", "content": "string (markdown)" }
  ],
  "files_to_change": ["string - file paths that need modification"],
  "risk_level": "low|medium|high",
  "estimated_complexity": "trivial|simple|moderate|complex"
}

Required sections by output type:
- spec: What This Does, Why It Matters, Architecture, Components, Data Model, Edge Cases, Verification Steps, Notes for Builder Agent
- research: Question, Findings, Recommendations, Sources, Next Steps
- bug_report: What Is Broken, Root Cause Analysis, Affected Files, Recommended Fix, Verification Steps
- refinement: What Exists Now, What Should Change, Why, Affected Files, Implementation Steps`;"""

if old_system in c:
    c = c.replace(old_system, new_system)
    print("2. Updated system prompt with JSON schema + caching optimization")
else:
    print("2. SKIP: System prompt not found (already patched?)")

# === 3. UPDATE FORMAT INSTRUCTIONS (move to user prompt, JSON-aware) ===

old_format_switch = """  let formatInstructions;
  switch (outputType) {
    case 'spec':
      formatInstructions = 'Produce a full spec document with sections: What This Does (Plain English), Why It Matters, Architecture, Components, Data Model, Edge Cases, Verification Steps, Notes for Builder Agent.';
      break;
    case 'research':
      formatInstructions = 'Produce a research report with sections: Question, Findings, Recommendations, Sources, Next Steps.';
      break;
    case 'bug_report':
      formatInstructions = 'Produce a bug report with sections: What Is Broken, Root Cause Analysis, Affected Files, Recommended Fix, Verification Steps.';
      break;
    case 'refinement':
      formatInstructions = 'Produce a refinement document with sections: What Exists Now, What Should Change, Why, Affected Files, Implementation Steps.';
      break;
  }"""

new_format_switch = """  const formatInstructions = 'Output type: ' + outputType + '. Include all required sections for this type in the JSON sections array.';"""

if old_format_switch in c:
    c = c.replace(old_format_switch, new_format_switch)
    print("3. Simplified format instructions (schema is in system prompt now)")
else:
    print("3. SKIP: Format switch not found (already patched?)")

# === 4. PARSE JSON RESPONSE AND CONVERT TO MARKDOWN ===

old_doc_build = """  // Build output document with frontmatter
  const slug = slugify(item.title);
  const filename = item.id + '-' + outputType + '-' + slug + '.md';
  const outputPath = path.join(OUTPUT_DIR, filename);

  const document = `---
source: davids-docket
docket_item_id: ${item.id}
title: ${item.title}
output_type: ${outputType}
confidence: ${confidence}
files_read:
${filesRead.map(f => '  - ' + f).join('\\n')}
processed_at: ${new Date().toISOString()}
model: ${result.model}
status: draft
---

${result.content}
`;"""

new_doc_build = """  // Parse structured JSON response and convert to markdown
  let parsedResponse = null;
  let markdownContent = result.content;

  try {
    parsedResponse = JSON.parse(result.content);
    // Convert structured JSON to readable markdown
    const sections = (parsedResponse.sections || [])
      .map(s => '## ' + s.heading + '\\n\\n' + s.content)
      .join('\\n\\n');
    markdownContent = (parsedResponse.summary ? parsedResponse.summary + '\\n\\n' : '') + sections;
    log('  Parsed structured JSON response (' + (parsedResponse.sections || []).length + ' sections)');
  } catch {
    log('  Response was not valid JSON, using raw markdown');
  }

  const slug = slugify(item.title);
  const filename = item.id + '-' + outputType + '-' + slug + '.md';
  const outputPath = path.join(OUTPUT_DIR, filename);

  const filesToChange = parsedResponse?.files_to_change || [];
  const riskLevel = parsedResponse?.risk_level || 'unknown';

  const document = `---
source: davids-docket
docket_item_id: ${item.id}
title: ${parsedResponse?.title || item.title}
output_type: ${outputType}
confidence: ${confidence}
risk_level: ${riskLevel}
files_to_change:
${filesToChange.map(f => '  - ' + f).join('\\n') || '  []'}
files_read:
${filesRead.map(f => '  - ' + f).join('\\n')}
processed_at: ${new Date().toISOString()}
model: ${result.model}
status: draft
---

${markdownContent}
`;"""

if old_doc_build in c:
    c = c.replace(old_doc_build, new_doc_build)
    print("4. Added JSON parsing + markdown conversion with structured metadata")
else:
    print("4. SKIP: Doc build not found (already patched?)")

# === 5. CONFIDENCE CALIBRATION (learn from feedback) ===
# Add calibration data to the confidence check call

old_confidence = """  // Check confidence
  const { confidence, reasons } = checkConfidence(result.content, outputType, filesRead);"""

new_confidence = """  // Check confidence (with calibration from past feedback)
  const feedbackHistory = db.prepare(
    "SELECT confidence, feedback FROM docket_items WHERE feedback IS NOT NULL ORDER BY completed_at DESC LIMIT 20"
  ).all();
  const { confidence, reasons } = checkConfidence(result.content, outputType, filesRead, feedbackHistory);"""

if old_confidence in c:
    c = c.replace(old_confidence, new_confidence)
    print("5. Added feedback history to confidence checker for calibration")
else:
    print("5. SKIP: Confidence check not found (already patched?)")

open(PROCESSOR, "w").write(c)
print("\nProcessor upgrade complete!")
