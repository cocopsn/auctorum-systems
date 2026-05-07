/**
 * Stylized SVG silhouette of a doctor used as a fallback portrait on the
 * tenant landing pages when no real photo (`tenant.config.landing.portrait_url`)
 * is uploaded. Kept inline so we don't hit the network for a single icon —
 * the page is already heavy with the gradient hero.
 *
 * Two variants: 'female' / 'male'. The Hero picks one based on the doctor's
 * gender (inferred from name prefix or explicit `medical.gender`).
 */

type Props = {
  gender: 'female' | 'male'
  className?: string
}

export default function DoctorSilhouette({ gender, className }: Props) {
  if (gender === 'male') return <MaleDoctor className={className} />
  return <FemaleDoctor className={className} />
}

function FemaleDoctor({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 280"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id="lab-coat-f" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E5F1F2" />
        </linearGradient>
        <linearGradient id="skin-f" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5C9A4" />
          <stop offset="100%" stopColor="#E8B488" />
        </linearGradient>
        <linearGradient id="hair-f" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3E2A1A" />
          <stop offset="100%" stopColor="#2A1A0E" />
        </linearGradient>
      </defs>

      {/* Lab coat shoulders + chest */}
      <path
        d="M 40 280 L 40 200 Q 60 165 90 158 L 110 175 L 130 175 L 150 158 Q 180 165 200 200 L 200 280 Z"
        fill="url(#lab-coat-f)"
      />
      {/* Lab coat collar V */}
      <path d="M 100 175 L 120 210 L 140 175 Z" fill="#0E5A66" />
      {/* Stethoscope */}
      <path
        d="M 105 178 Q 95 215 110 230 Q 130 240 130 220"
        stroke="#1F1F2D"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="130" cy="222" r="6" fill="#C9A227" />
      {/* Neck */}
      <rect x="110" y="135" width="20" height="28" fill="url(#skin-f)" />
      {/* Hair (long, behind face) */}
      <path
        d="M 75 125 Q 70 90 100 75 Q 120 70 140 75 Q 175 90 165 130 L 165 175 Q 150 165 145 145 Q 145 138 140 138 L 100 138 Q 95 138 95 145 Q 90 165 75 175 Z"
        fill="url(#hair-f)"
      />
      {/* Face */}
      <ellipse cx="120" cy="115" rx="32" ry="38" fill="url(#skin-f)" />
      {/* Hair fringe over forehead */}
      <path
        d="M 90 92 Q 110 76 120 78 Q 132 76 150 92 Q 145 100 138 95 Q 128 88 120 92 Q 112 88 102 95 Q 95 100 90 92 Z"
        fill="url(#hair-f)"
      />
      {/* Eyes */}
      <ellipse cx="108" cy="115" rx="2" ry="3" fill="#1F1F2D" />
      <ellipse cx="132" cy="115" rx="2" ry="3" fill="#1F1F2D" />
      {/* Smile */}
      <path
        d="M 110 130 Q 120 137 130 130"
        stroke="#1F1F2D"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      {/* Earring hint */}
      <circle cx="89" cy="123" r="1.5" fill="#C9A227" />
      <circle cx="151" cy="123" r="1.5" fill="#C9A227" />
    </svg>
  )
}

function MaleDoctor({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 280"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id="lab-coat-m" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E5F1F2" />
        </linearGradient>
        <linearGradient id="skin-m" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F0BD93" />
          <stop offset="100%" stopColor="#D9A372" />
        </linearGradient>
        <linearGradient id="hair-m" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1F1410" />
          <stop offset="100%" stopColor="#0F0A07" />
        </linearGradient>
      </defs>
      {/* Lab coat */}
      <path
        d="M 40 280 L 40 200 Q 60 165 90 158 L 110 175 L 130 175 L 150 158 Q 180 165 200 200 L 200 280 Z"
        fill="url(#lab-coat-m)"
      />
      <path d="M 100 175 L 120 210 L 140 175 Z" fill="#0E5A66" />
      {/* Tie hint */}
      <path d="M 117 175 L 123 175 L 122 210 L 120 220 L 118 210 Z" fill="#9A2828" />
      {/* Stethoscope */}
      <path
        d="M 105 178 Q 95 215 110 230 Q 130 240 130 220"
        stroke="#1F1F2D"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="130" cy="222" r="6" fill="#C9A227" />
      <rect x="110" y="135" width="20" height="28" fill="url(#skin-m)" />
      {/* Hair (short) */}
      <path
        d="M 88 100 Q 90 78 120 76 Q 150 78 152 100 L 150 90 Q 130 86 120 88 Q 110 86 90 90 Z"
        fill="url(#hair-m)"
      />
      {/* Face */}
      <ellipse cx="120" cy="118" rx="30" ry="36" fill="url(#skin-m)" />
      {/* Eyebrows */}
      <path d="M 102 108 Q 108 105 113 108" stroke="#1F1F2D" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 127 108 Q 132 105 138 108" stroke="#1F1F2D" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <ellipse cx="108" cy="118" rx="2" ry="3" fill="#1F1F2D" />
      <ellipse cx="132" cy="118" rx="2" ry="3" fill="#1F1F2D" />
      {/* Beard hint */}
      <path
        d="M 100 138 Q 120 154 140 138 Q 138 148 130 152 Q 120 156 110 152 Q 102 148 100 138 Z"
        fill="#1F1410"
        opacity="0.6"
      />
      {/* Smile */}
      <path
        d="M 110 134 Q 120 140 130 134"
        stroke="#1F1F2D"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
