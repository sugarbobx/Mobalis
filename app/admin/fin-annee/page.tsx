"use client";

import { useState } from "react";
import { GraduationCap, FileText, ArrowRightLeft, Send, Award } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ANNEE_SCOLAIRE } from "@/lib/mock";
import type { Classe, Serie, PassageClasse, MentionBac } from "@/lib/mock";
import { useStore } from "@/lib/store";

const CLASSE_SUIVANTE: Record<Classe, Classe | null> = { "2nde": "1ère", "1ère": "Tle", Tle: null };
const SEUIL_PASSAGE = 10;
const SEUIL_ALERTE_SERIE = 8;
const MENTIONS: MentionBac[] = ["passable", "assez_bien", "bien", "tres_bien"];
const MENTION_LABELS: Record<MentionBac, string> = { passable: "Passable", assez_bien: "Assez bien", bien: "Bien", tres_bien: "Très bien" };

export default function AdminFinAnneePage() {
  const {
    eleves,
    getMatiere,
    getMoyennesParMatiere,
    getPassageByEleve,
    getBulletinsByEleve,
    getSuggestionsByEleve,
    getResultatBacByEleve,
    addPassageClasse,
    validerPassage,
    addBulletin,
    addSuggestionReorientation,
    transmettreSuggestion,
    addResultatBac,
    marquerDiplome,
  } = useStore();

  const elevesActifs = eleves.filter((e) => e.statutCompte === "actif");

  function moyenneGenerale(eleveId: string): number | null {
    const moyennes = getMoyennesParMatiere(eleveId, ANNEE_SCOLAIRE);
    if (moyennes.length === 0) return null;
    return Math.round((moyennes.reduce((acc, m) => acc + m.moyenne, 0) / moyennes.length) * 10) / 10;
  }

  function genererPreconisation(eleveId: string, classe: Classe) {
    const moyenne = moyenneGenerale(eleveId);
    if (moyenne === null) {
      toast.error("Aucune note enregistrée cette année pour cet élève — impossible de préconiser.");
      return;
    }
    const classeSuivante = CLASSE_SUIVANTE[classe];
    if (!classeSuivante) return; // Tle : pas de passage, voir section Sortie
    const passage: PassageClasse = {
      id: `passage-${eleveId}-${Date.now()}`,
      eleveId,
      anneeScolaire: ANNEE_SCOLAIRE,
      classeActuelle: classe,
      classeSuivante: moyenne >= SEUIL_PASSAGE ? classeSuivante : classe,
      statut: moyenne >= SEUIL_PASSAGE ? "preconise_passage" : "preconise_redoublement",
      moyenneGenerale: moyenne,
    };
    addPassageClasse(passage);
    toast.info(`Préconisation générée : ${passage.statut === "preconise_passage" ? "passage" : "redoublement"}`);
  }

  function validerEtNotifier(passageId: string, eleveNom: string) {
    validerPassage(passageId);
    toast.success(`Passage validé pour ${eleveNom} — sa classe est mise à jour.`);
  }

  function genererBulletin(eleveId: string, eleveNom: string) {
    const moyennesParMatiere = getMoyennesParMatiere(eleveId, ANNEE_SCOLAIRE);
    const moyenne = moyenneGenerale(eleveId);
    if (moyenne === null) {
      toast.error("Aucune note enregistrée cette année — impossible de générer le bulletin.");
      return;
    }
    addBulletin({
      id: `bulletin-${eleveId}-${Date.now()}`,
      eleveId,
      anneeScolaire: ANNEE_SCOLAIRE,
      moyennesParMatiere,
      moyenneGenerale: moyenne,
      appreciationGenerale: moyenne >= 14 ? "Excellent travail cette année." : moyenne >= SEUIL_PASSAGE ? "Année satisfaisante, continue ainsi." : "Année difficile, un accompagnement renforcé est recommandé.",
    });
    toast.success(`Bulletin ${ANNEE_SCOLAIRE} généré pour ${eleveNom}`);
  }

  function genererSuggestion(eleveId: string, serie: Serie, matiereFaibleId: string, moyenneFaible: number) {
    const alternatives: Serie[] = ["A", "C", "D", "SES"].filter((s) => s !== serie) as Serie[];
    addSuggestionReorientation({
      id: `sugg-${eleveId}-${Date.now()}`,
      eleveId,
      anneeScolaire: ANNEE_SCOLAIRE,
      serieActuelle: serie,
      serieSuggeree: alternatives[0],
      motif: `Difficulté persistante en ${getMatiere(matiereFaibleId)?.nom} (moyenne ${moyenneFaible}/20).`,
      transmiseAuParent: false,
    });
    toast.info("Suggestion de réorientation générée — visible par toi uniquement pour l'instant.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Fin d&apos;année scolaire {ANNEE_SCOLAIRE}</h1>
        <p className="text-sm text-muted-foreground">
          Bulletins, passage de classe et suggestions de réorientation — toute décision finale reste manuelle.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="size-4" /> Passage de classe</CardTitle>
          <CardDescription>Préconisation calculée sur la moyenne générale de l&apos;année ({SEUIL_PASSAGE}/20 minimum) — validation manuelle obligatoire.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Élève</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Moyenne</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {elevesActifs.filter((e) => e.classe !== "Tle").map((eleve) => {
                const passage = getPassageByEleve(eleve.id, ANNEE_SCOLAIRE);
                const moyenne = moyenneGenerale(eleve.id);
                return (
                  <TableRow key={eleve.id}>
                    <TableCell className="font-medium">{eleve.prenom} {eleve.nom}</TableCell>
                    <TableCell>{eleve.classe} · {eleve.serie}</TableCell>
                    <TableCell>{moyenne !== null ? `${moyenne}/20` : "—"}</TableCell>
                    <TableCell>
                      {!passage ? (
                        <Badge variant="outline">Aucune préconisation</Badge>
                      ) : passage.statut === "valide" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400">Validé → {passage.classeSuivante}</Badge>
                      ) : passage.statut === "preconise_passage" ? (
                        <Badge className="bg-amber-500/15 text-amber-400">Préconisé : passage en {passage.classeSuivante}</Badge>
                      ) : (
                        <Badge className="bg-red-500/15 text-red-400">Préconisé : redoublement</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!passage ? (
                        <Button size="sm" variant="outline" onClick={() => genererPreconisation(eleve.id, eleve.classe)}>
                          Générer la préconisation
                        </Button>
                      ) : passage.statut !== "valide" ? (
                        <Button size="sm" onClick={() => validerEtNotifier(passage.id, `${eleve.prenom} ${eleve.nom}`)}>
                          Valider
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="size-4" /> Bulletins annuels</CardTitle>
          <CardDescription>Fige les notes de l&apos;année dans un bulletin consultable élève/parent/admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Élève</TableHead>
                <TableHead>Bulletins générés</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {elevesActifs.map((eleve) => {
                const bulletins = getBulletinsByEleve(eleve.id);
                const dejaGenere = bulletins.some((b) => b.anneeScolaire === ANNEE_SCOLAIRE);
                return (
                  <TableRow key={eleve.id}>
                    <TableCell className="font-medium">{eleve.prenom} {eleve.nom}</TableCell>
                    <TableCell>
                      {bulletins.length === 0 ? (
                        <span className="text-sm text-muted-foreground">Aucun</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {bulletins.map((b) => (
                            <Badge key={b.id} variant="outline">{b.anneeScolaire} · {b.moyenneGenerale}/20</Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" disabled={dejaGenere} onClick={() => genererBulletin(eleve.id, `${eleve.prenom} ${eleve.nom}`)}>
                        {dejaGenere ? `Bulletin ${ANNEE_SCOLAIRE} généré` : "Générer le bulletin"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggestions de réorientation de série</CardTitle>
          <CardDescription>Basées sur les matières où la moyenne est sous {SEUIL_ALERTE_SERIE}/20 — informatif, jamais automatique.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {elevesActifs.map((eleve) => {
            const moyennes = getMoyennesParMatiere(eleve.id, ANNEE_SCOLAIRE);
            const faible = moyennes.filter((m) => m.moyenne < SEUIL_ALERTE_SERIE).sort((a, b) => a.moyenne - b.moyenne)[0];
            const suggestions = getSuggestionsByEleve(eleve.id).filter((s) => s.anneeScolaire === ANNEE_SCOLAIRE);
            if (!faible && suggestions.length === 0) return null;
            return (
              <div key={eleve.id} className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{eleve.prenom} {eleve.nom} — {eleve.classe} · Série {eleve.serie}</p>
                {suggestions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span>{s.motif} Série {s.serieSuggeree} suggérée.</span>
                    {s.transmiseAuParent ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400">Transmise au parent</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { transmettreSuggestion(s.id); toast.success("Suggestion transmise au parent."); }}>
                        <Send /> Transmettre au parent
                      </Button>
                    )}
                  </div>
                ))}
                {faible && suggestions.length === 0 && (
                  <Button size="sm" variant="outline" onClick={() => genererSuggestion(eleve.id, eleve.serie, faible.matiereId, faible.moyenne)}>
                    Générer une suggestion
                  </Button>
                )}
              </div>
            );
          })}
          {elevesActifs.every((eleve) => {
            const moyennes = getMoyennesParMatiere(eleve.id, ANNEE_SCOLAIRE);
            const faible = moyennes.some((m) => m.moyenne < SEUIL_ALERTE_SERIE);
            return !faible && getSuggestionsByEleve(eleve.id).length === 0;
          }) && (
            <EmptyState icon={GraduationCap} title="Aucune alerte" hint="Aucun élève ne présente de moyenne sous le seuil d'alerte cette année." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award className="size-4" /> Sortie du système — Terminale</CardTitle>
          <CardDescription>Résultat du Bac et passage du compte en lecture seule.</CardDescription>
        </CardHeader>
        <CardContent>
          {elevesActifs.filter((e) => e.classe === "Tle").length === 0 ? (
            <EmptyState icon={Award} title="Aucun élève en Terminale actif" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Élève</TableHead>
                  <TableHead>Résultat au Bac</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elevesActifs.filter((e) => e.classe === "Tle").map((eleve) => {
                  const resultat = getResultatBacByEleve(eleve.id);
                  return (
                    <TableRow key={eleve.id}>
                      <TableCell className="font-medium">{eleve.prenom} {eleve.nom}</TableCell>
                      <TableCell>
                        {resultat ? (
                          <Badge className={resultat.obtenu ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}>
                            {resultat.obtenu ? `Obtenu${resultat.mention ? ` — ${MENTION_LABELS[resultat.mention]}` : ""}` : "Non obtenu"}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Non renseigné</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <ResultatBacDialog
                          disabled={!!resultat}
                          onSubmit={(obtenu, mention) => {
                            addResultatBac({ eleveId: eleve.id, anneeScolaire: ANNEE_SCOLAIRE, obtenu, mention });
                            marquerDiplome(eleve.id);
                            toast.success(`${eleve.prenom} ${eleve.nom} marqué diplômé — compte en lecture seule.`);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultatBacDialog({ disabled, onSubmit }: { disabled: boolean; onSubmit: (obtenu: boolean, mention?: MentionBac) => void }) {
  const [open, setOpen] = useState(false);
  const [obtenu, setObtenu] = useState(true);
  const [mention, setMention] = useState<MentionBac>("passable");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" disabled={disabled} />}>
        Renseigner le résultat
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Résultat au Baccalauréat</DialogTitle>
          <DialogDescription>Marque l&apos;élève comme diplômé — le compte passe en lecture seule.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select items={{ oui: "Obtenu", non: "Non obtenu" }} value={obtenu ? "oui" : "non"} onValueChange={(v) => v && setObtenu(v === "oui")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="oui">Obtenu</SelectItem>
              <SelectItem value="non">Non obtenu</SelectItem>
            </SelectContent>
          </Select>
          {obtenu && (
            <Select items={MENTION_LABELS} value={mention} onValueChange={(v) => v && setMention(v as MentionBac)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MENTIONS.map((m) => <SelectItem key={m} value={m}>{MENTION_LABELS[m]}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => { onSubmit(obtenu, obtenu ? mention : undefined); setOpen(false); }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
