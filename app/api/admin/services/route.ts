import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { requireAdmin } from '@/lib/auth/admin'

const execAsync = promisify(exec)

const SCRIPT = 'bash scripts/services.sh'

async function runServices(command: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(`${SCRIPT} ${command}`, {
      cwd: process.cwd(),
      timeout: 30000,
    })
    return stdout || stderr || 'Done'
  } catch (err: any) {
    return err.stdout || err.stderr || err.message || 'Command failed'
  }
}

// Strip ANSI color codes for JSON output
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const output = await runServices('status')
  return NextResponse.json({ output: stripAnsi(output) })
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action, service } = body as { action: string; service?: string }

  const allowed = ['up', 'down', 'start', 'stop', 'clean', 'status']
  if (!allowed.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const services = ['prod', 'dev', 'ollama', 'openclaw', 'anythingllm', 'postgres']
  if ((action === 'start' || action === 'stop') && (!service || !services.includes(service))) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
  }

  const command = service ? `${action} ${service}` : action
  const output = await runServices(command)

  return NextResponse.json({ output: stripAnsi(output), command })
}
