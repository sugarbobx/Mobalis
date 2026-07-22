"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * Composant invisible monté dans le layout élève (toutes les pages), pas
 * seulement /student/grades — sinon un élève qui ne joue que des défis ou de
 * la révision sans jamais visiter "Notes & objectifs" ne débloque aucun
 * badge en pratique (audit item #14).
 */
export function BadgeEvaluator({ eleveId }: { eleveId: string }) {
  const { evaluerBadges } = useStore();

  useEffect(() => {
    if (eleveId) void evaluerBadges(eleveId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eleveId]);

  return null;
}
