"use client"

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import { useState, useRef, useCallback } from "react"
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react"

export function ResizableImage({ node, updateAttributes, selected, deleteNode, editor }: NodeViewProps) {
  const [resizing, setResizing] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const { src, width, height, alt, align = "center" } = node.attrs

  const handleResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setResizing(true)

      const startX = e.clientX
      const startWidth = imgRef.current?.offsetWidth || width || 300
      const startHeight = imgRef.current?.offsetHeight || height || 200
      const aspectRatio = startWidth / startHeight

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        let newWidth = Math.max(50, startWidth + deltaX)
        newWidth = Math.min(newWidth, 700)
        const newHeight = Math.round(newWidth / aspectRatio)
        updateAttributes({ width: Math.round(newWidth), height: newHeight })
      }

      const onMouseUp = () => {
        setResizing(false)
        document.removeEventListener("mousemove", onMouseMove)
        document.removeEventListener("mouseup", onMouseUp)
      }

      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    },
    [width, height, updateAttributes],
  )

  const justifyMap = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  } as const

  const isEditable = editor?.isEditable ?? true

  return (
    <NodeViewWrapper className={`flex ${justifyMap[(align as keyof typeof justifyMap)] || "justify-center"} my-4`}>
      <div className={`relative inline-block group ${resizing ? "select-none" : ""}`}>
        <img
          ref={imgRef}
          src={src}
          alt={alt || ""}
          width={width || undefined}
          height={height || undefined}
          className={`rounded-lg shadow-md max-w-full h-auto block ${
            selected ? "ring-2 ring-teal-500 ring-offset-2" : ""
          }`}
          draggable={false}
        />

        {/* Controls overlay — visible on select or hover */}
        {isEditable && (selected || resizing) && (
          <>
            {/* Alignment + delete toolbar */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-lg px-1 py-0.5 z-10">
              <button
                type="button"
                onClick={() => updateAttributes({ align: "left" })}
                className={`p-1.5 rounded transition-colors ${align === "left" ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:bg-slate-100"}`}
                title="Alinear izquierda"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateAttributes({ align: "center" })}
                className={`p-1.5 rounded transition-colors ${align === "center" ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:bg-slate-100"}`}
                title="Centrar"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateAttributes({ align: "right" })}
                className={`p-1.5 rounded transition-colors ${align === "right" ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:bg-slate-100"}`}
                title="Alinear derecha"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
              <button
                type="button"
                onClick={deleteNode}
                className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-colors"
                title="Eliminar imagen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Resize handles */}
            {(["se"] as const).map((corner) => (
              <div
                key={corner}
                onMouseDown={handleResize}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
                style={{ touchAction: "none" }}
              >
                <div className="absolute bottom-1 right-1 w-3 h-3 bg-teal-500 rounded-sm border-2 border-white shadow" />
              </div>
            ))}

            {/* Dimension badge */}
            {width && (
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                {Math.round(width)}px
              </div>
            )}
          </>
        )}
      </div>
    </NodeViewWrapper>
  )
}
