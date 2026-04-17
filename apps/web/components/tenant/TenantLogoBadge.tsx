'use client';

import { useState } from 'react';
import Image from 'next/image';

interface TenantLogoBadgeProps {
  logoUrl?: string | null;
  name: string;
}

function getInitials(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function TenantLogoBadge({ logoUrl, name }: TenantLogoBadgeProps) {
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <Image
        src={logoUrl}
        alt={name}
        width={32}
        height={32}
        className="rounded-lg object-contain"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[11px] font-bold text-white"
    >
      {getInitials(name)}
    </div>
  );
}
