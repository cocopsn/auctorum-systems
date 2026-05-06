"use client";

/**
 * PWA install prompt — only shown on mobile, only when the browser actually
 * fires `beforeinstallprompt` (Android Chrome / Edge / Samsung) AND the user
 * is signed in (so we don't pester anonymous landing visitors). On iOS Safari
 * the event never fires; we surface a softer banner with manual instructions
 * the first time we detect an iOS Safari session in standalone-eligible mode.
 *
 * Dismissals are sticky (localStorage) for 30 days so the banner doesn't
 * become noise.
 */
import { useEffect, useState } from "react";

const DISMISS_KEY = "auctorum_install_dismissed_at";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
  // Standalone Safari = Apple's own installed-mode flag
  const isInStandalone = (navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  return isIos && !isInStandalone;
}

function recentlyDismissed(): boolean {
  try {
    const at = window.localStorage.getItem(DISMISS_KEY);
    if (!at) return false;
    const ts = parseInt(at, 10);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (recentlyDismissed()) return;

    // Already installed → never show
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS path — no event, show after 4s if still on page
    if (isIosSafari()) {
      const timer = setTimeout(() => {
        setShowIos(true);
        setShow(true);
      }, 4000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setShow(false);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-cyan-700/30 bg-cyan-700 px-4 py-3 text-white shadow-xl backdrop-blur md:hidden"
      role="dialog"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold">Instalar Auctorum Med</p>
          {showIos ? (
            <p className="mt-1 text-xs leading-snug text-cyan-50">
              Toca el ícono <span aria-hidden>⎙</span> Compartir y luego
              "Agregar a pantalla de inicio".
            </p>
          ) : (
            <p className="mt-1 text-xs leading-snug text-cyan-50">
              Acceso rápido desde tu celular y notificaciones de citas.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!showIos && (
            <button
              type="button"
              onClick={install}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-50"
            >
              Instalar
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar"
            className="rounded-lg border border-white/40 px-2 py-2 text-xs text-white/90 hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
