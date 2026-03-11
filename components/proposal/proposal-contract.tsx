'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { FileText, RotateCcw } from 'lucide-react'

type ProposalContractProps = {
  bodySnapshot: string
  contractStatus: string | null
  signatureDataUrl: string | null
  onSignatureChange: (dataUrl: string | null) => void
  agreedToTerms: boolean
  onAgreedChange: (agreed: boolean) => void
}

/**
 * Renders contract body from a snapshot string.
 * Supports basic markdown-like formatting:
 * - **bold**, *italic*, # headings, - bullet points, blank line = paragraph
 */
function renderContractBody(text: string): string {
  const lines = text.split('\n')
  let html = ''
  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Heading
    if (trimmed.startsWith('### ')) {
      if (inList) {
        html += '</ul>'
        inList = false
      }
      html += `<h4 class="text-sm font-bold text-gray-800 mt-6 mb-2">${escapeHtml(trimmed.slice(4))}</h4>`
    } else if (trimmed.startsWith('## ')) {
      if (inList) {
        html += '</ul>'
        inList = false
      }
      html += `<h3 class="text-base font-bold text-gray-900 mt-6 mb-2">${escapeHtml(trimmed.slice(3))}</h3>`
    } else if (trimmed.startsWith('# ')) {
      if (inList) {
        html += '</ul>'
        inList = false
      }
      html += `<h2 class="text-lg font-bold text-gray-900 mt-6 mb-3">${escapeHtml(trimmed.slice(2))}</h2>`
    }
    // Bullet
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        html += '<ul class="list-disc pl-5 space-y-1 text-sm text-gray-700">'
        inList = true
      }
      html += `<li>${formatInline(trimmed.slice(2))}</li>`
    }
    // Blank line
    else if (trimmed === '') {
      if (inList) {
        html += '</ul>'
        inList = false
      }
    }
    // Regular text
    else {
      if (inList) {
        html += '</ul>'
        inList = false
      }
      html += `<p class="text-sm text-gray-700 mb-2 leading-relaxed">${formatInline(trimmed)}</p>`
    }
  }

  if (inList) html += '</ul>'
  return html
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatInline(text: string): string {
  let result = escapeHtml(text)
  // Bold: **text**
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic: *text*
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
  return result
}

export function ProposalContract({
  bodySnapshot,
  contractStatus,
  signatureDataUrl,
  onSignatureChange,
  agreedToTerms,
  onAgreedChange,
}: ProposalContractProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const alreadySigned = contractStatus === 'signed'

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || alreadySigned) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas resolution for retina displays
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Styling
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [alreadySigned])

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number

    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (alreadySigned) return
      e.preventDefault()

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      const { x, y } = getCanvasPoint(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
      setIsDrawing(true)
      setHasDrawn(true)
    },
    [alreadySigned, getCanvasPoint]
  )

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || alreadySigned) return
      e.preventDefault()

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      const { x, y } = getCanvasPoint(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    },
    [isDrawing, alreadySigned, getCanvasPoint]
  )

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)

    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    onSignatureChange(dataUrl)
  }, [isDrawing, onSignatureChange])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    setHasDrawn(false)
    onSignatureChange(null)
  }, [onSignatureChange])

  const contractHtml = renderContractBody(bodySnapshot)

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-5 w-5 text-amber-600" />
        <h2 className="text-xl font-semibold text-gray-900">Service Agreement</h2>
      </div>

      {/* Contract body */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 sm:p-8 max-h-[500px] overflow-y-auto mb-6">
        <div dangerouslySetInnerHTML={{ __html: contractHtml }} />
      </div>

      {/* Signature area */}
      {!alreadySigned && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Your Signature</label>
              {hasDrawn && (
                <button
                  type="button"
                  onClick={clearSignature}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>

            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-[120px] touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            {!hasDrawn && (
              <p className="text-xs text-gray-400 mt-1.5">
                Draw your signature above using your mouse or finger.
              </p>
            )}
          </div>

          {/* Terms checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => onAgreedChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-600">
              I agree to the terms above and confirm that my signature is legally binding.
            </span>
          </label>
        </div>
      )}

      {alreadySigned && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-200">
          This contract has been signed.
        </div>
      )}
    </section>
  )
}
