"use client";

import Link from "next/link";
import { Award, Bell, CalendarClock, ListChecks, Target, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DefiDuMoment } from "@/components/student/defi-du-moment";
import { ProfilProgression } from "@/components/student/profil-progression";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";

// Entrée standard = arrivée en 2nde à la rentrée officielle (première quinzaine de septembre) — §2.1/§2.2.
function messageOnboarding(classeEntree: string, dateEntree: string): string | null {
  const [, mois, jour] = dateEntree.split("-").map(Number);
  const estRentree = mois === 9 && jour <= 15;
  if (classeEntree === "2nde" && estRentree) return null;
  if (classeEntree !== "2nde") {
    return `Tu as rejoint MOBALIS directement en ${classeEntree} — on structure ton suivi autour des enjeux de ce niveau (${classeEntree === "Tle" ? "le Baccalauréat" : "le Probatoire"}), pas d'inquiétude si tout n'est pas encore familier.`;
  }
  return "Tu rejoins MOBALIS en cours d'année — les ressources partagées depuis la rentrée restent accessibles \"à consulter si besoin\", à ton rythme.";
}

export default function StudentTodayPage() {
  const { getSeancesByEleve, getDevoirsByEleve, getMatiere, getBadgesByEleve, getObjectifsByEleve, getScoreMoyen, getEleve, getRepetiteur } = useStore();
  const CURRENT_STUDENT_ID = useCurrentUser().id;
  const eleve = getEleve(CURRENT_STUDENT_ID);
  if (!eleve) return null;
  const messageEntree = messageOnboarding(eleve.classeEntree, eleve.dateEntree);
  const aujourdHui = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const seances = getSeancesByEleve(CURRENT_STUDENT_ID);
  const prochaine = seances.find((s) => s.statut === "a_venir");
  const devoirs = getDevoirsByEleve(CURRENT_STUDENT_ID);
  const aFaire = devoirs
    .filter((d) => d.assignation.statut === "a_faire")
    .sort((a, b) => a.assignation.dateEcheance.localeCompare(b.assignation.dateEcheance));
  const badges = getBadgesByEleve(CURRENT_STUDENT_ID);
  const objectifs = getObjectifsByEleve(CURRENT_STUDENT_ID);
  const scoreMoyen = getScoreMoyen(CURRENT_STUDENT_ID);

  const rappels: string[] = [];
  if (prochaine) {
    rappels.push(
      `Séance de ${getMatiere(prochaine.matiereId)?.nom} le ${prochaine.date} à ${prochaine.heureDebut} avec ${getRepetiteur(prochaine.repetiteurId)?.prenom} ${getRepetiteur(prochaine.repetiteurId)?.nom}.`
    );
  }
  for (const d of aFaire.slice(0, 2)) {
    rappels.push(`Devoir "${d.exercice.titre}" (${d.matiere.nom}) à rendre avant le ${d.assignation.dateEcheance}.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Bonjour {eleve.prenom}</h1>
        <p className="text-sm text-muted-foreground">Voici ton point du jour — {aujourdHui}.</p>
      </div>

      {messageEntree && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm">{messageEntree}</p>
        </div>
      )}

      <ProfilProgression />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Moyenne générale" value={scoreMoyen !== null ? `${scoreMoyen}/100` : "—"} icon={Target} accent />
        <StatCard label="Devoirs à faire" value={aFaire.length} icon={ListChecks} />
        <StatCard label="Badges obtenus" value={badges.length} icon={Award} />
        <StatCard label="Objectifs en cours" value={objectifs.length} icon={Target} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="size-4" /> Prochaine séance</CardTitle>
          </CardHeader>
          <CardContent>
            {prochaine ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{getMatiere(prochaine.matiereId)?.nom}</p>
                <p className="text-muted-foreground">
                  {prochaine.date} · {prochaine.heureDebut} - {prochaine.heureFin}
                </p>
                <p className="text-muted-foreground">{prochaine.lieu}</p>
                <p className="text-muted-foreground">
                  Avec {getRepetiteur(prochaine.repetiteurId)?.prenom} {getRepetiteur(prochaine.repetiteurId)?.nom}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune séance à venir programmée.</p>
            )}
            <Link href="/student/schedule" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}>
              Voir l&apos;emploi du temps
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="size-4" /> Rappels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rappels.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun rappel pour le moment.</p>
            ) : (
              rappels.map((r, i) => (
                <p key={i} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{r}</p>
              ))
            )}
          </CardContent>
        </Card>

        <DefiDuMoment />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Devoirs à faire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {aFaire.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tout est à jour, bravo !</p>
          ) : (
            aFaire.map((d) => (
              <div key={d.assignation.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{d.exercice.titre}</p>
                  <p className="text-muted-foreground">{d.matiere.nom} · échéance {d.assignation.dateEcheance}</p>
                </div>
                <StatusBadge status={d.assignation.statut} />
              </div>
            ))
          )}
          <Link href="/student/homework" className={buttonVariants({ variant: "link", size: "sm", className: "px-0" })}>
            Voir tous les devoirs →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
