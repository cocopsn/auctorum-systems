'use client'

/**
 * Tiny inline-SVG sparkline. Draws a polyline + a soft area fill underneath.
 * No deps. Animates the path on mount via CSS stroke-dashoffset.
 *
 * - Renders nothing if data is empty or all zeros (avoids drawing a flat
 *   line that pretends to be data).
 */
export function Sparkline({
  data,
  color = '#0E7490',
  width = 96,
  height = 28,
  strokeWidth = 1.4,
}: {
  data: number[]
  color?: string
  width?: number
  height?: number
  strokeWidth?: number
}) {
  if (!data || data.length < 2) return <div style={{ width, height }} aria-hidden />
  const max = Math.max(...data)
  const min = Math.min(...data)
  if (max === 0 && min === 0) return <div style={{ width, height }} aria-hidden />

  const range = max - min || 1
  const stepX = (width - strokeWidth) / (data.length - 1)
  const points = data.map((v, i) => {
    const x = i * stepX + strokeWidth / 2
    const y = height - ((v - min) / range) * (height - strokeWidth) - strokeWidth / 2
    return [x, y] as const
  })

  const linePath =
    'M' + points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L ')
  const areaPath =
    `${linePath} L ${points[points.length - 1][0].toFixed(2)},${height} L ${points[0][0].toFixed(2)},${height} Z`

  // Approx path length for animation (pythagorean sum). Cheap & good enough.
  let pathLen = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0]
    const dy = points[i][1] - points[i - 1][1]
    pathLen += Math.sqrt(dx * dx + dy * dy)
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id={`spark-fill-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-fill-${color.replace('#', '')})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: pathLen.toFixed(2),
          strokeDashoffset: pathLen.toFixed(2),
          animation: 'sparkline-draw 900ms ease-out forwards',
        }}
      />
      <style>{`@keyframes sparkline-draw { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  )
}
