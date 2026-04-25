import { NextRequest, NextResponse } from 'next/server'
import {
  addClientHouseholdMember,
  removeClientHouseholdMember,
  updateClientHouseholdMember,
} from '@/lib/hub/household-actions'

interface RouteContext {
  params: {
    clientId: string
  }
}

async function readJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function mutationResponse(result: { success: boolean; error?: string }) {
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const body = await readJson(request)
  if (!body) {
    return mutationResponse({ success: false, error: 'Invalid household member payload' })
  }

  const result = await addClientHouseholdMember({
    ...body,
    clientId: params.clientId,
  } as Parameters<typeof addClientHouseholdMember>[0])

  return mutationResponse(result)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const body = await readJson(request)
  if (!body) {
    return mutationResponse({ success: false, error: 'Invalid household member payload' })
  }

  const result = await updateClientHouseholdMember({
    ...body,
    clientId: params.clientId,
  } as Parameters<typeof updateClientHouseholdMember>[0])

  return mutationResponse(result)
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const body = await readJson(request)
  if (!body) {
    return mutationResponse({ success: false, error: 'Invalid household member payload' })
  }

  const result = await removeClientHouseholdMember({
    ...body,
    clientId: params.clientId,
  } as Parameters<typeof removeClientHouseholdMember>[0])

  return mutationResponse(result)
}
