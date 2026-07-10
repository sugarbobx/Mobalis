"use client";

import { useState } from "react";
import { Send, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { CompteLectureSeule } from "@/components/shared/compte-lecture-seule";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";

export default function StudentMessagesPage() {
  const { getMessagesByEleve, getMatiere, demandesAide, addMessage, addDemandeAide, getEleve, getRepetiteur } = useStore();
  const CURRENT_STUDENT_ID = useCurrentUser().id;
  const eleve =
    getEleve(CURRENT_STUDENT_ID) ??
    { id: "", nom: "", prenom: "", classe: "2nde" as const, serie: "C" as const, styleApprentissage: "", parentIds: [], repetiteurIds: [], matiereIds: [], avatarInitiales: "", dateEntree: "", classeEntree: "2nde" as const, statutCompte: "actif" as const };
  const lectureSeule = eleve.statutCompte === "diplome";
  const messages = getMessagesByEleve(CURRENT_STUDENT_ID);
  const demandes = demandesAide.filter((d) => d.eleveId === CURRENT_STUDENT_ID);
  const [saisie, setSaisie] = useState("");
  const [openAide, setOpenAide] = useState(false);
  const [matiereAide, setMatiereAide] = useState(eleve.matiereIds[0] ?? "");
  const [sujetAide, setSujetAide] = useState("");

  function envoyer(repetiteurId: string) {
    if (!saisie.trim() || lectureSeule) return;
    addMessage({
      eleveId: CURRENT_STUDENT_ID,
      repetiteurId,
      auteur: "eleve",
      contenu: saisie.trim(),
      date: new Date().toISOString(),
      lu: false,
    });
    setSaisie("");
  }

  function envoyerDemande() {
    if (!sujetAide.trim() || !matiereAide || lectureSeule) return;
    addDemandeAide({
      eleveId: CURRENT_STUDENT_ID,
      matiereId: matiereAide,
      sujet: sujetAide.trim(),
      date: "2026-07-05",
      statut: "ouverte",
    });
    toast.success(`Demande d'aide en ${getMatiere(matiereAide)?.nom} envoyée`);
    setSujetAide("");
    setOpenAide(false);
  }

  return (
    <div className="space-y-6">
      {lectureSeule && <CompteLectureSeule />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Messagerie</h1>
          <p className="text-sm text-muted-foreground">Échange avec tes répétiteurs et demande de l&apos;aide si besoin.</p>
        </div>

        <Dialog open={openAide} onOpenChange={setOpenAide}>
          <DialogTrigger render={<Button variant="outline" disabled={lectureSeule} />}>
            <HelpCircle />
            Demander de l&apos;aide
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Demande d&apos;aide / séance supplémentaire</DialogTitle>
              <DialogDescription>Signale une difficulté, ton répétiteur sera notifié.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Matière</Label>
                <Select
                  items={Object.fromEntries(eleve.matiereIds.map((id) => [id, getMatiere(id)?.nom ?? id]))}
                  value={matiereAide}
                  onValueChange={(v) => v && setMatiereAide(v)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {eleve.matiereIds.map((id) => (
                      <SelectItem key={id} value={id}>{getMatiere(id)?.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sujet">Décris ta difficulté</Label>
                <Input id="sujet" value={sujetAide} onChange={(e) => setSujetAide(e.target.value)} placeholder="Ex. Je bloque sur les fractions" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={envoyerDemande}>Envoyer la demande</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {demandes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mes demandes d&apos;aide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {demandes.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm">
                <span>{getMatiere(d.matiereId)?.nom} — {d.sujet}</span>
                <Badge variant={d.statut === "ouverte" ? "default" : "secondary"}>
                  {d.statut === "ouverte" ? "Envoyée" : "Traitée"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={eleve.repetiteurIds[0]}>
        <TabsList>
          {eleve.repetiteurIds.map((id) => {
            const rep = getRepetiteur(id)!;
            return <TabsTrigger key={id} value={id}>{rep.prenom} {rep.nom}</TabsTrigger>;
          })}
        </TabsList>
        {eleve.repetiteurIds.map((repetiteurId) => (
          <TabsContent key={repetiteurId} value={repetiteurId} className="mt-4">
            <Card>
              <CardContent className="flex flex-col gap-4">
                <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                  {messages.filter((m) => m.repetiteurId === repetiteurId).map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        m.auteur === "eleve" ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted"
                      }`}
                    >
                      {m.contenu}
                    </div>
                  ))}
                  {messages.filter((m) => m.repetiteurId === repetiteurId).length === 0 && (
                    <EmptyState
                      icon={Send}
                      title="Aucun message pour l'instant"
                      hint="Écris ton premier message ci-dessous, ton répétiteur le verra."
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={saisie}
                    onChange={(e) => setSaisie(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && envoyer(repetiteurId)}
                    placeholder="Écris ton message..."
                    disabled={lectureSeule}
                  />
                  <Button size="icon" onClick={() => envoyer(repetiteurId)} disabled={lectureSeule}>
                    <Send />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
