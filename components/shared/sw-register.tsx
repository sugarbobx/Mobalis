"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker en production uniquement — en dev il
 * interférerait avec le HMR et servirait des pages périmées depuis le cache.
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // l'app fonctionne normalement sans SW
    });
  }, []);

  return null;
}
