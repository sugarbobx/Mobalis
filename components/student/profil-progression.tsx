/**
 * components/student/profil-progression.tsx
 *
 * Profil de progression unifié : rassemble en une seule carte quatre systèmes
 * qui existent déjà séparément dans l'app — points de défis (lib/defis.ts),
 * badges (store), objectifs (store), et maîtrise par matière (lib/revision.ts).
 *
 * Sources de données (toutes réelles, aucune fonction inventée) :
 *  - getEleve / getBadgesByEleve / getObjectifsByEleve / getMatiere / `badges`
 *    → lib/store.ts (synchrone, déjà chargé dans le store client)
 *  - getMaitrise() → lib/revision.ts (RPC Supabase, scope = utilisateur courant)
 *  - getClassementAnnuel(scope) → lib/defis.ts (RPC Supabase) — sert uniquement
 *    à extraire la ligne `estMoi` pour le total de points et le rang.
 *
 * Le système de "niveau" vit dans lib/niveau.ts (voir ce fichier pour le
 * détail de la convention et ses limites).
 *
 * Détection "nouveau depuis la dernière visite" (niveau franchi, objectif
 * atteint) : implémentée via localStorage, PAR APPAREIL. Ce n'est pas une
 * synchronisation multi-device — si l'élève change de téléphone, une
 * célébration déjà vue pourrait se redéclencher. Une vraie solution
 * cross-device demanderait un flag "vu" côté serveur.
 *
 * Le mapping ICONES_BADGES doit être étendu si de nouveaux badges sont ajoutés
 * en migration (le champ `icone` contient un nom de composant lucide-react,
 * voir supabase/migrations/0017_badges_engine.sql).
 */

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Award,
  CheckCircle2,
  Flame,
  Lock,
  Rocket,
  Star,
  Target,
  TrendingUp,
  Zap,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { MasteryRadarChart, MAX_AXES_RADAR, type RadarAxis } from "@/components/shared/mastery-radar-chart";
import { MasteryBarList } from "@/components/shared/mastery-bar-list";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";
import { getMaitrise, type MaitriseChapitre } from "@/lib/revision";
import { getClassementAnnuel, type LigneClassement } from "@/lib/defis";
import { calculerNiveau } from "@/lib/niveau";

const ICONES_BADGES: Record<string, LucideIcon> = {
  Rocket,
  Zap,
  Crown,
  Star,
  Award,
};

/** Un badge obtenu il y a moins de N jours est marqué "nouveau". */
const FENETRE_NOUVEAU_JOURS = 4;
function estRecent(dateISO: string): boolean {
  const jours = (Date.now() - new Date(dateISO).getTime()) / 86_400_000;
  return jours >= 0 && jours < FENETRE_NOUVEAU_JOURS;
}

type BadgeCatalogue = ReturnType<typeof useStore>["badges"][number];

export function ProfilProgression() {
  const { getEleve, getBadgesByEleve, getObjectifsByEleve, getMatiere, badges: catalogueBadges } = useStore();
  const eleveId = useCurrentUser().id;
  const eleve = getEleve(eleveId);

  const [maitrise, setMaitrise] = useState<MaitriseChapitre[] | null>(null);
  const [classement, setClassement] = useState<LigneClassement[] | null>(null);
  const [chargement, setChargement] = useState(true);
  const [badgeOuvert, setBadgeOuvert] = useState<BadgeCatalogue | null>(null);

  useEffect(() => {
    let annule = false;
    Promise.all([getMaitrise(), getClassementAnnuel("classe")])
      .then(([m, c]) => {
        if (annule) return;
        setMaitrise(m);
        setClassement(c);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, []);

  const badgesObtenus = eleve ? getBadgesByEleve(eleveId) : [];
  const tousLesObjectifs = eleve ? getObjectifsByEleve(eleveId) : [];
  const objectifsActifs = tousLesObjectifs.filter((o) => o.progression < 100);
  const objectifsAtteints = tousLesObjectifs.filter((o) => o.progression >= 100);
  const moi = classement?.find((l) => l.estMoi) ?? null;
  const { niveau, pointsDansNiveau, pointsPourNiveauSuivant } = calculerNiveau(moi?.totalPoints ?? 0);

  // --- Célébration : niveau franchi depuis la dernière visite (localStorage) ---
  useEffect(() => {
    if (!moi || !eleve) return;
    const cle = `mobalis:profil:${eleveId}:dernierNiveauVu`;
    const brut = Number(localStorage.getItem(cle));
    // Pas de valeur stockée -> on prend le niveau actuel comme référence,
    // pour ne jamais "célébrer" rétroactivement la progression déjà faite.
    const dernierVu = Number.isFinite(brut) && brut > 0 ? brut : niveau;
    if (niveau > dernierVu) {
      toast.success(`Niveau ${niveau} débloqué !`, { description: "Continue comme ça 🚀" });
    }
    localStorage.setItem(cle, String(niveau));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niveau, moi, eleve, eleveId]);

  // --- Célébration : objectifs atteints depuis la dernière visite ---
  useEffect(() => {
    if (!eleve || tousLesObjectifs.length === 0) return;
    const cle = `mobalis:profil:${eleveId}:objectifsAtteintsVus`;
    let vus: string[] = [];
    try {
      vus = JSON.parse(localStorage.getItem(cle) ?? "[]");
    } catch {
      vus = [];
    }
    const nouveaux = objectifsAtteints.filter((o) => !vus.includes(o.id));
    nouveaux.forEach((o) => {
      toast.success(`Objectif atteint : ${o.titre}`, { description: "Bravo, un de plus !" });
    });
    if (nouveaux.length > 0) {
      localStorage.setItem(cle, JSON.stringify([...vus, ...nouveaux.map((o) => o.id)]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eleve, eleveId, tousLesObjectifs.length]);

  if (!eleve) return null;

  // Agrège la maîtrise par chapitre en moyenne par matière (un axe par
  // matière plutôt que par chapitre, pour garder le radar/la liste lisible).
  const radarData: RadarAxis[] = maitrise
    ? Object.values(
        maitrise.reduce<Record<string, { label: string; total: number; n: number; color?: string }>>((acc, m) => {
          const matiere = getMatiere(m.matiereId);
          if (!matiere) return acc;
          acc[m.matiereId] ??= { label: matiere.nom, total: 0, n: 0, color: matiere.couleur };
          acc[m.matiereId].total += m.pct;
          acc[m.matiereId].n += 1;
          return acc;
        }, {})
      ).map((s) => ({ label: s.label, value: Math.round(s.total / s.n), color: s.color }))
    : [];

  const maitriseGlobale =
    radarData.length > 0 ? Math.round(radarData.reduce((acc, d) => acc + d.value, 0) / radarData.length) : null;

  const badgeOuvertObtenu = badgeOuvert ? badgesObtenus.find((b) => b.id === badgeOuvert.id) : undefined;
  const IconeBadgeOuvert = badgeOuvert ? ICONES_BADGES[badgeOuvert.icone] ?? Award : Award;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {eleve.avatarInitiales}
          </span>
          <div>
            <CardTitle>
              {eleve.prenom} {eleve.nom}
            </CardTitle>
            <CardDescription>
              {eleve.classe} · {eleve.serie}
            </CardDescription>
          </div>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            <Flame className="size-4" /> Niveau {niveau}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Barre de progression du niveau */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
            <span>
              {moi?.totalPoints ?? 0} points au total
              {moi ? ` · rang #${moi.rang} de la classe` : ""}
            </span>
            {pointsPourNiveauSuivant !== null && (
              <span>
                {pointsDansNiveau}/{pointsPourNiveauSuivant} vers le niveau {niveau + 1}
              </span>
            )}
          </div>
          {pointsPourNiveauSuivant !== null && (
            <Progress value={(pointsDansNiveau / pointsPourNiveauSuivant) * 100} />
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Maîtrise par matière : radar si <= MAX_AXES_RADAR, sinon liste à barres */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <TrendingUp className="size-4" /> Maîtrise par matière
            </p>
            {chargement ? (
              <p className="text-xs text-muted-foreground">Chargement…</p>
            ) : radarData.length >= 3 ? (
              <>
                {radarData.length > MAX_AXES_RADAR ? (
                  <MasteryBarList data={radarData} />
                ) : (
                  <MasteryRadarChart data={radarData} />
                )}
                {maitriseGlobale !== null && (
                  <p className="text-center text-xs text-muted-foreground">Maîtrise globale : {maitriseGlobale}%</p>
                )}
              </>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="Pas encore assez de données"
                hint="Fais quelques sessions de révision dans au moins 3 matières pour débloquer ce suivi."
              />
            )}
          </div>

          {/* Vitrine de badges — tap pour ouvrir le détail (mobile-friendly) */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Award className="size-4" /> Badges ({badgesObtenus.length}/{catalogueBadges.length})
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
              {catalogueBadges.map((badge) => {
                const obtenu = badgesObtenus.find((b) => b.id === badge.id);
                const Icone = ICONES_BADGES[badge.icone] ?? Award;
                const nouveau = obtenu && estRecent(obtenu.dateObtention);
                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => setBadgeOuvert(badge)}
                    className={`relative flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors ${
                      obtenu ? "border-primary/30 bg-primary/10" : "border-border bg-muted/30"
                    }`}
                  >
                    {nouveau && (
                      <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" aria-hidden="true" />
                    )}
                    <span
                      className={`flex size-9 items-center justify-center rounded-full ${
                        obtenu ? "text-primary" : "text-muted-foreground/40"
                      }`}
                    >
                      {obtenu ? <Icone className="size-5" /> : <Lock className="size-4" />}
                    </span>
                    <span className={`text-[10px] leading-tight ${obtenu ? "" : "text-muted-foreground/50"}`}>
                      {badge.nom}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Objectifs actifs */}
        {objectifsActifs.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Target className="size-4" /> Objectifs en cours
            </p>
            <div className="space-y-2">
              {objectifsActifs.map((o) => (
                <div key={o.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{o.titre}</span>
                    <span className="text-muted-foreground">{o.progression}%</span>
                  </div>
                  <Progress value={o.progression} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Objectifs atteints — repliés, ne disparaissent plus silencieusement */}
        {objectifsAtteints.length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium text-foreground">
              {objectifsAtteints.length} objectif{objectifsAtteints.length > 1 ? "s" : ""} atteint
              {objectifsAtteints.length > 1 ? "s" : ""}
            </summary>
            <ul className="mt-2 space-y-1.5">
              {objectifsAtteints.map((o) => (
                <li key={o.id} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 shrink-0 text-primary" /> {o.titre}
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>

      {/* Détail d'un badge — bottom sheet, accessible au tap comme au clavier */}
      <Sheet open={badgeOuvert !== null} onOpenChange={(open) => !open && setBadgeOuvert(null)}>
        <SheetContent side="bottom">
          {badgeOuvert && (
            <>
              <SheetHeader>
                <div
                  className={`mx-auto flex size-14 items-center justify-center rounded-full ${
                    badgeOuvertObtenu ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40"
                  }`}
                >
                  {badgeOuvertObtenu ? <IconeBadgeOuvert className="size-7" /> : <Lock className="size-6" />}
                </div>
                <SheetTitle className="text-center">{badgeOuvert.nom}</SheetTitle>
                <SheetDescription className="text-center">{badgeOuvert.description}</SheetDescription>
              </SheetHeader>
              <p className="px-4 pb-4 text-center text-xs text-muted-foreground">
                {badgeOuvertObtenu ? `Obtenu le ${badgeOuvertObtenu.dateObtention}` : "Pas encore débloqué."}
              </p>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
