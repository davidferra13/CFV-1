type JsonBodyReadSuccess<T> = {
  ok: true
  data: T
}

type JsonBodyReadFailure = {
  ok: false
  error: string
  status: 400 | 413
}

export type JsonBodyReadResult<T> = JsonBodyReadSuccess<T> | JsonBodyReadFailure

type JsonBodyReadOptions = {
  maxBytes: number
  invalidJsonMessage?: string
  payloadTooLargeMessage?: string
  emptyBodyMessage?: string
}

const textEncoder = new TextEncoder()

export const PUBLIC_INTAKE_JSON_BODY_MAX_BYTES = 64 * 1024

async function readTextWithLimit(
  request: Request,
  maxBytes: number
): Promise<{ ok: true; text: string } | { ok: false; status: 413 }> {
  const contentLengthHeader = request.headers.get('content-length')
  const declaredLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, status: 413 }
  }

  const body = request.body
  if (!body) {
    return { ok: true, text: '' }
  }

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let totalBytes = 0
  let text = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    totalBytes += value.byteLength
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined)
      return { ok: false, status: 413 }
    }

    text += decoder.decode(value, { stream: true })
  }

  text += decoder.decode()

  if (textEncoder.encode(text).byteLength > maxBytes) {
    return { ok: false, status: 413 }
  }

  return { ok: true, text }
}

export async function readJsonBodyWithLimit<T>(
  request: Request,
  options: JsonBodyReadOptions
): Promise<JsonBodyReadResult<T>> {
  const invalidJsonMessage = options.invalidJsonMessage ?? 'Invalid JSON body'
  const payloadTooLargeMessage = options.payloadTooLargeMessage ?? 'Request body too large'
  const emptyBodyMessage = options.emptyBodyMessage ?? invalidJsonMessage

  try {
    const textResult = await readTextWithLimit(request, options.maxBytes)
    if (!textResult.ok) {
      return {
        ok: false,
        error: payloadTooLargeMessage,
        status: 413,
      }
    }

    if (!textResult.text.trim()) {
      return {
        ok: false,
        error: emptyBodyMessage,
        status: 400,
      }
    }

    try {
      return {
        ok: true,
        data: JSON.parse(textResult.text) as T,
      }
    } catch {
      return {
        ok: false,
        error: invalidJsonMessage,
        status: 400,
      }
    }
  } catch {
    return {
      ok: false,
      error: invalidJsonMessage,
      status: 400,
    }
  }
}
