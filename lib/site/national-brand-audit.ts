import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import {
  NATIONAL_BRAND_AUDIT_ALLOWLIST,
  NATIONAL_BRAND_AUDIT_EXCLUDED_PATHS,
  NATIONAL_BRAND_AUDIT_EXTENSIONS,
  NATIONAL_BRAND_AUDIT_ROOTS,
  NATIONAL_BRAND_AUDIT_RULES,
} from '../../config/national-brand-audit.mjs'

type NationalBrandAuditRule = {
  id: string
  label: string
  pattern: RegExp
  contextPattern?: RegExp
}

type NationalBrandAuditAllowlistEntry = {
  path: RegExp
  ruleIds?: string[]
  reason: string
}

export type NationalBrandAuditFinding = {
  relativePath: string
  line: number
  column: number
  lineText: string
  matchedText: string
  ruleId: string
  ruleLabel: string
}

export type NationalBrandAuditResult = {
  roots: readonly string[]
  filesScanned: number
  findings: NationalBrandAuditFinding[]
}

function normalizeAuditPath(value: string) {
  return value.replace(/\\/g, '/')
}

function isCommentLikeLine(lineText: string) {
  const trimmed = lineText.trim()
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*/') ||
    trimmed.startsWith('*')
  )
}

function isExcludedPath(relativePath: string) {
  return NATIONAL_BRAND_AUDIT_EXCLUDED_PATHS.some((pattern) => pattern.test(relativePath))
}

function isAllowlisted(
  relativePath: string,
  ruleId: string,
  allowlist: NationalBrandAuditAllowlistEntry[]
) {
  return allowlist.some((entry) => {
    if (!entry.path.test(relativePath)) return false
    return !entry.ruleIds || entry.ruleIds.includes(ruleId)
  })
}

function walkDirectory(rootDir: string, currentPath: string, filePaths: string[]) {
  for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
    const absolutePath = join(currentPath, entry.name)
    if (entry.isDirectory()) {
      walkDirectory(rootDir, absolutePath, filePaths)
      continue
    }

    const relativePath = normalizeAuditPath(relative(rootDir, absolutePath))
    if (isExcludedPath(relativePath)) continue

    if (!NATIONAL_BRAND_AUDIT_EXTENSIONS.has(extname(entry.name))) continue
    filePaths.push(absolutePath)
  }
}

export function scanNationalBrandAuditContent({
  relativePath,
  content,
  rules = NATIONAL_BRAND_AUDIT_RULES,
  allowlist = NATIONAL_BRAND_AUDIT_ALLOWLIST,
}: {
  relativePath: string
  content: string
  rules?: NationalBrandAuditRule[]
  allowlist?: NationalBrandAuditAllowlistEntry[]
}) {
  const normalizedPath = normalizeAuditPath(relativePath)
  const findings: NationalBrandAuditFinding[] = []
  const lines = content.split(/\r?\n/)

  for (const [index, lineText] of lines.entries()) {
    if (isCommentLikeLine(lineText)) continue

    const lineWindow = lines
      .slice(Math.max(0, index - 1), Math.min(lines.length, index + 2))
      .join(' ')

    for (const rule of rules) {
      if (rule.contextPattern && !rule.contextPattern.test(lineWindow)) continue

      const match = lineText.match(rule.pattern)
      if (!match) continue
      if (isAllowlisted(normalizedPath, rule.id, allowlist)) continue

      const column = Math.max(lineText.toLowerCase().indexOf(match[0].toLowerCase()), 0) + 1
      findings.push({
        relativePath: normalizedPath,
        line: index + 1,
        column,
        lineText: lineText.trim(),
        matchedText: match[0],
        ruleId: rule.id,
        ruleLabel: rule.label,
      })
    }
  }

  return findings
}

export function runNationalBrandAudit(rootDir = process.cwd()): NationalBrandAuditResult {
  const absoluteRoot = resolve(rootDir)
  const filePaths: string[] = []

  for (const root of NATIONAL_BRAND_AUDIT_ROOTS) {
    walkDirectory(absoluteRoot, resolve(absoluteRoot, root), filePaths)
  }

  const findings = filePaths.flatMap((absolutePath) => {
    const relativePath = normalizeAuditPath(relative(absoluteRoot, absolutePath))
    const content = readFileSync(absolutePath, 'utf8')
    return scanNationalBrandAuditContent({ relativePath, content })
  })

  return {
    roots: NATIONAL_BRAND_AUDIT_ROOTS,
    filesScanned: filePaths.length,
    findings,
  }
}
