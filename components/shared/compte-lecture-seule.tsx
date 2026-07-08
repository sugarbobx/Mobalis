import { Lock } from "lucide-react";

/** Bannière affichée quand le compte élève est passé en lecture seule (§2.6 — diplômé/sorti). */
export function CompteLectureSeule() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <Lock className="size-4 shrink-0 text-amber-400" />
      <p className="text-sm">
        Ce compte est en lecture seule — le parcours à MOBALIS est terminé (diplômé). L&apos;historique reste consultable, aucune nouvelle action n&apos;est possible.
      </p>
    </div>
  );
}
