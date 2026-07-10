"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Swords, Clock, Medal, CalendarRange, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useStore } from "@/lib/store";
import { useOnlineStatus } from "@/lib/use-online-status";
import {
  getDefisEleve,
  getClassement,
  getClassementAnnuel,
  lundiDeLaSemaine,
  type DefiEleve,
  type LigneClassement,
} from "@/lib/defis";

const MEDAILLES = ["🥇", "🥈", "🥉"];

function formatSemaine(lundi: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(lundi);
}

export default function StudentChallengesPage() {
  const online = useOnlineStatus();
  const [defis, setDefis] = useState<DefiEleve[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!online) return;
    getDefisEleve().then((d) => {
      setDefis(d);
      setChargement(false);
    });
  }, [online]);

  if (!online) {
    return (
      <EmptyState
        icon={WifiOff}
        title="Connexion requise"
        hint="Les défis nécessitent une connexion — le tirage des questions et la correction se font sur le serveur pour éviter la triche. Reviens une fois reconnecté."
      />
    );
  }

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const jouables = (d: DefiEleve) =>
    d.statut === "en_cours" || (d.statut === "a_jouer" && d.dateDebut <= aujourdHui && aujourdHui <= d.dateFin);

  const hebdo = defis.filter((d) => d.type === "hebdo");
  const mensuel = defis.filter((d) => d.type === "mensuel");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Défis</h1>
        <p className="text-sm text-muted-foreground">
          QCM chronométré, tirage personnel, une seule tentative — chaque élève reçoit des questions différentes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Swords className="size-4" /> Défis hebdomadaires</CardTitle>
          <CardDescription>
            Lancés par tes répétiteurs, une matière à la fois — les points comptent pour le classement de la semaine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ListeDefis defis={hebdo} jouables={jouables} chargement={chargement}
            vide="Aucun défi hebdomadaire pour l'instant — tes répétiteurs les publient au fil des semaines." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarRange className="size-4" /> Défi mensuel</CardTitle>
          <CardDescription>
            Lancé par le centre, il couvre toutes les matières de ton programme — les points comptent pour le classement annuel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ListeDefis defis={mensuel} jouables={jouables} chargement={chargement}
            vide="Aucun défi mensuel en cours." />
        </CardContent>
      </Card>

      <Classements />
    </div>
  );
}

function ListeDefis({
  defis,
  jouables,
  chargement,
  vide,
}: {
  defis: DefiEleve[];
  jouables: (d: DefiEleve) => boolean;
  chargement: boolean;
  vide: string;
}) {
  const { getMatiere } = useStore();
  if (chargement) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (defis.length === 0) return <p className="text-sm text-muted-foreground">{vide}</p>;

  return (
    <>
      {defis.map((d) => (
        <div
          key={d.id}
          className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 ${
            d.statut === "joue" ? "bg-muted/20" : ""
          }`}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium">{d.titre}</span>
              {d.matiereId ? (
                <Badge variant="outline">{getMatiere(d.matiereId)?.nom}</Badge>
              ) : (
                <Badge variant="outline">Toutes tes matières</Badge>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" /> {d.nbQuestionsTotal} question{d.nbQuestionsTotal > 1 ? "s" : ""} · jusqu&apos;au {d.dateFin} · {d.pointsBase} pts en jeu
            </p>
          </div>
          {d.statut === "joue" ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">{d.score}/100</span>
              <span className="font-semibold text-primary">+{d.points} pts</span>
            </div>
          ) : jouables(d) ? (
            <Link href={`/student/challenges/${d.id}`} className={buttonVariants({ size: "sm" })}>
              {d.statut === "en_cours" ? "Reprendre" : "Jouer"}
            </Link>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Fermé</Badge>
          )}
        </div>
      ))}
    </>
  );
}

function Classements() {
  const lundiCourant = lundiDeLaSemaine(new Date());
  const semaines = [0, 1, 2, 3].map((i) => {
    const d = new Date(lundiCourant);
    d.setDate(d.getDate() - i * 7);
    return d;
  });
  const [semaineIso, setSemaineIso] = useState(semaines[0].toISOString().slice(0, 10));
  const [onglet, setOnglet] = useState("classe");
  const semaine = new Date(`${semaineIso}T00:00:00`);

  const items = Object.fromEntries(
    semaines.map((s, i) => [s.toISOString().slice(0, 10), i === 0 ? "Cette semaine" : `Semaine du ${formatSemaine(s)}`])
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Trophy className="size-4" /> Classements</CardTitle>
            <CardDescription>
              Hebdo : remis à zéro chaque lundi (défis hebdomadaires). Annuel : cumul des défis mensuels sur l&apos;année scolaire.
            </CardDescription>
          </div>
          {onglet !== "annuel" && (
            <Select items={items} value={semaineIso} onValueChange={(v) => v && setSemaineIso(v)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(items).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={onglet} onValueChange={setOnglet}>
          <TabsList>
            <TabsTrigger value="classe">Ma classe</TabsTrigger>
            <TabsTrigger value="centre">Mon centre</TabsTrigger>
            <TabsTrigger value="annuel">Annuel</TabsTrigger>
          </TabsList>
          <TabsContent value="classe" className="mt-4">
            <TableClassement scope="classe" semaine={semaine} />
          </TabsContent>
          <TabsContent value="centre" className="mt-4">
            <TableClassement scope="centre" semaine={semaine} />
          </TabsContent>
          <TabsContent value="annuel" className="mt-4">
            <TableClassement scope="centre" annuel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TableClassement({
  scope,
  semaine,
  annuel = false,
}: {
  scope: "classe" | "centre";
  semaine?: Date;
  annuel?: boolean;
}) {
  const [lignes, setLignes] = useState<LigneClassement[]>([]);
  const [chargement, setChargement] = useState(true);
  const semaineIso = semaine?.toISOString().slice(0, 10) ?? "";

  useEffect(() => {
    setChargement(true);
    const promesse = annuel
      ? getClassementAnnuel(scope)
      : getClassement(scope, new Date(`${semaineIso}T00:00:00`));
    promesse.then((l) => {
      setLignes(l);
      setChargement(false);
    });
  }, [scope, semaineIso, annuel]);

  if (chargement) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (lignes.length === 0) {
    return (
      <EmptyState
        icon={Medal}
        title={annuel ? "Aucun point annuel pour l'instant" : "Personne n'a encore marqué de points cette semaine"}
        hint={annuel ? "Les défis mensuels alimentent ce classement — participe au prochain." : "Joue un défi pour ouvrir le classement — le premier arrivé prend la tête."}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {lignes.map((l) => (
        <div
          key={l.eleveId}
          className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
            l.estMoi ? "border-primary/50 bg-primary/10" : "border-border"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="w-8 text-center font-semibold">
              {l.rang <= 3 ? MEDAILLES[l.rang - 1] : `${l.rang}.`}
            </span>
            <span className="font-medium">
              {l.prenom} {l.nomInitiale}
              {l.estMoi && <span className="ml-1.5 text-xs text-primary">(moi)</span>}
            </span>
            {scope === "centre" && <Badge variant="outline" className="text-[10px]">{l.classe}</Badge>}
          </div>
          <span className="font-semibold text-primary">{l.totalPoints} pts</span>
        </div>
      ))}
    </div>
  );
}
