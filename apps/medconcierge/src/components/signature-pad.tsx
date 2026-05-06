'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Eraser } from 'lucide-react'

/**
 * Canvas signature pad — touch + mouse support, no external deps.
 * Outputs base64 PNG via onChange when the user lifts the pen.
 *
 * Usage:
 *   <SignaturePad onChange={(b64) => setSig(b64)} label="Firma del paciente" />
 *
 * The canvas internal resolution is decoupled from the displayed CSS
 * size so the produced PNG is crisp at retina densities.
 */
interface Props {
  onChange: (base64: string | null) => void
  width?: number
  height?: number
  label?: string
  initialValue?: string | null
  disabled?: boolean
  required?: boolean
}

export function SignaturePad({
  onChange,
  width = 480,
  height = 160,
  label,
  initialValue,
  disabled = false,
  required = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const [hasInk, setHasInk] = useState(Boolean(initialValue))

  // Initialize canvas with DPR scaling.
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0F172A'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)
    return ctx
  }, [width, height])

  useEffect(() => {
    const ctx = setupCanvas()
    if (!ctx) return
    if (initialValue) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        setHasInk(true)
      }
      img.src = initialValue
    }
  }, [setupCanvas, initialValue, width, height])

  function pointFromEvent(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number
    if ('touches' in e) {
      const t = e.touches[0] ?? e.changedTouches[0]
      clientX = t.clientX
      clientY = t.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    }
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    if (disabled) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = pointFromEvent(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    drawingRef.current = true
  }

  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawingRef.current || disabled) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const p = pointFromEvent(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  function end() {
    if (!drawingRef.current) return
    drawingRef.current = false
    setHasInk(true)
    const canvas = canvasRef.current
    if (canvas) {
      onChange(canvas.toDataURL('image/png'))
    }
  }

  function clear() {
    if (disabled) return
    const ctx = setupCanvas()
    if (!ctx) return
    setHasInk(false)
    onChange(null)
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div
        className={`relative rounded-lg border-2 bg-white overflow-hidden touch-none ${
          disabled
            ? 'border-gray-200 opacity-60 cursor-not-allowed'
            : hasInk
            ? 'border-gray-300'
            : 'border-dashed border-gray-300'
        }`}
        style={{ width: '100%', maxWidth: width, height }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {!hasInk && !disabled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-300 text-sm select-none">
            Firme aquí con dedo o ratón
          </div>
        )}
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={clear}
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-rose-600 transition-colors"
        >
          <Eraser className="h-3 w-3" />
          Limpiar firma
        </button>
      )}
    </div>
  )
}
