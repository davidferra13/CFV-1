import * as auditConfig from '../config/national-brand-audit.mjs'
import nationalBrandAudit from '../lib/site/national-brand-audit.ts'

const AS_JSON = process.argv.includes('--json')

function formatFindingLine(
  finding: ReturnType<typeof nationalBrandAudit.runNationalBrandAudit>['findings'][number]
) {
  return [
    `${finding.relativePath}:${finding.line}:${finding.column}`,
    `${finding.ruleLabel} [${finding.ruleId}]`,
    finding.lineText,
  ].join(' | ')
}

function main() {
  const result = nationalBrandAudit.runNationalBrandAudit()

  if (AS_JSON) {
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.findings.length > 0 ? 1 : 0)
  }

  if (result.findings.length === 0) {
    console.log(
      `National brand audit passed. Scanned ${result.filesScanned} files across ${result.roots.join(', ')}.`
    )
    console.log(`Allowlist entries: ${auditConfig.NATIONAL_BRAND_AUDIT_ALLOWLIST.length}`)
    return
  }

  console.error(
    `National brand audit failed with ${result.findings.length} finding(s) across ${result.filesScanned} scanned files.`
  )
  for (const finding of result.findings) {
    console.error(`- ${formatFindingLine(finding)}`)
  }
  process.exit(1)
}

main()
