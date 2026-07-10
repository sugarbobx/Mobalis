"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Swords } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  getDefisEleve,
  getClassement,
  lundiDeLaSemaine,
  type DefiEleve,
  type LigneClassement,
} from "@/lib/defis";

/** Carte du tableau de bord élève : prochain défi à jouer + mon rang de la semaine. */
export function DefiDuMoment() {
  const [defis, setDefis] = useState<DefiEleve[]>([]);
  const [maLigne, setMaLigne] = useState<LigneClassement | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    Promise.all([getDefisEleve(), getClassement("classe", lundiDeLaSemaine(new Date()))]).then(
      ([d, classement]) => {
        setDefis(d);
        setMaLigne(classement.find((l) => l.estMoi) ?? null);
        setChargement(false);
      }
    );
  }, []);

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const prochain = defis.find(
    (d) => d.statut !== "joue" && d.dateDebut <= aujourdHui && aujourdHui <= d.dateFin
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Swords className="size-4" /> Défi de la semaine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {chargement ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : prochain ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">{prochain.titre}</p>
            <p className="text-muted-foreground">
              {prochain.nbQuestionsTotal} question{prochain.nbQuestionsTotal > 1 ? "s" : ""} · {prochain.pointsBase} pts en jeu · jusqu&apos;au {prochain.dateFin}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun défi à jouer pour le moment.</p>
        )}
        {maLigne && (
          <p className="text-sm">
            Mon rang cette semaine : <span className="font-semibold text-primary">{maLigne.rang}ᵉ</span> ({maLigne.totalPoints} pts)
          </p>
        )}
        <Link
          href={prochain ? `/student/challenges/${prochain.id}` : "/student/challenges"}
          className={buttonVariants({ variant: prochain ? "default" : "outline", size: "sm" })}
        >
          {prochain ? (prochain.statut === "en_cours" ? "Reprendre le défi" : "Jouer maintenant") : "Voir les classements"}
        </Link>
      </CardContent>
    </Card>
  );
}
