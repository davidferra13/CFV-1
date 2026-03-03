#!/usr/bin/env node
/**
 * Cute Audit Completion Notifier
 * Watches the audit log and pops up a notification when done
 */

import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const LOG_FILE = '/tmp/main-audit-final.log'
const CHECK_INTERVAL = 5000 // Check every 5 seconds

let lastSize = 0

async function showNotification(title, message) {
  try {
    // Windows 10+ native notification using PowerShell
    const psCommand = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show('${message}', '${title}', 'OK', 'Information')
    `.trim()

    await execAsync(`powershell -Command "${psCommand}"`, { timeout: 30000 })
  } catch (err) {
    console.error('Notification failed:', err.message)
  }
}

async function checkAuditComplete() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      console.log('Waiting for audit to start...')
      return false
    }

    const content = fs.readFileSync(LOG_FILE, 'utf-8')
    const currentSize = content.length

    // Check if audit is complete
    if (
      content.includes('AUDIT COMPLETE') ||
      content.includes('Health Score:') ||
      content.includes('Report written to:')
    ) {
      // Extract health score if available
      const scoreMatch = content.match(/Health Score: (\d+)\/100/)
      const score = scoreMatch ? scoreMatch[1] : '?'

      await showNotification(
        '🎉 Audit Complete!',
        `Your system health score is: ${score}/100\n\nResults are ready to review!\n\nCheck the reports directory for details.`
      )

      return true
    }

    // Show progress every 30 seconds
    if (currentSize > lastSize) {
      const lines = content.split('\n')
      const lastLine = lines[lines.length - 2] || ''

      // Extract progress percentage if available
      if (lastLine.includes('[') && lastLine.includes(']')) {
        console.log(`✓ ${lastLine.trim().slice(0, 100)}`)
      }

      lastSize = currentSize
    }

    return false
  } catch (err) {
    console.error('Error checking audit:', err.message)
    return false
  }
}

async function startWatcher() {
  console.log('🔍 Audit Notifier Started')
  console.log('📊 Watching for audit completion...')
  console.log('💬 A cute popup will appear when done!')
  console.log('')

  let isComplete = false

  while (!isComplete) {
    isComplete = await checkAuditComplete()

    if (!isComplete) {
      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL))
    }
  }

  console.log('\n✅ Audit Complete! Notification sent.')
  process.exit(0)
}

startWatcher().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
