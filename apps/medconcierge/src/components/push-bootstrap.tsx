"use client";

/**
 * Tiny client component that hooks into the dashboard mount and, on first
 * sign-in (after the user has had a chance to actually interact), prompts
 * for browser push permission and registers the subscription with the
 * server. We DON'T pop the permission dialog on first load — Chrome requires
 * a user gesture for Safari, and forced prompts get auto-rejected.
 *
 * The component is invisible — it only exists to fire `ensurePushSubscription`
 * after a small delay AND only if NEXT_PUBLIC_VAPID_PUBLIC_KEY is configured.
 * Without VAPID keys it no-ops silently.
 */
import { useEffect } from "react";
import { ensurePushSubscription, isPushSupported } from "@/lib/push-client";

const SEEN_KEY = "auctorum_push_bootstrapped_at";

export function PushBootstrap() {
  useEffect(() => {
    if (!isPushSupported()) return;
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;

    // Don't ask again within 24h if we already prompted (whether or not the
    // user accepted)
    try {
      const at = window.localStorage.getItem(SEEN_KEY);
      if (at && Date.now() - parseInt(at, 10) < 24 * 60 * 60 * 1000) return;
    } catch {
      /* ignore */
    }

    // If permission is already denied, never re-prompt — that's a hard NO
    if (typeof Notification !== "undefined" && Notification.permission === "denied") return;

    // If already granted, just refresh the subscription on the server (no UI)
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      ensurePushSubscription().catch(() => {});
      return;
    }

    // Defer so we don't compete with first-paint and Vercel-style hydration
    const timer = setTimeout(() => {
      ensurePushSubscription().finally(() => {
        try {
          window.localStorage.setItem(SEEN_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
      });
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
