'use client';

import { useState } from 'react';

export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
      aria-label="Compartir portal"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
      </svg>
      {copied ? 'Copiado!' : 'Compartir'}
    </button>
  );
}
