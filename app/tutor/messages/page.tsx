"use client";

import { useEffect, useState } from "react";
import { Send, HelpCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";

export default function TutorMessagesPage() {
  const { messages, demandesAide, getMatiere, getEleve, getRepetiteur, addMessage, updateDemandeAide, marquerMessagesLus } = useStore();
  const CURRENT_TUTOR_ID = useCurrentUser().id;
  const tutor = getRepetiteur(CURRENT_TUTOR_ID) ?? { id: "", nom: "", prenom: "", matiereIds: [], eleveIds: [], avatarInitiales: "" };
  const [saisie, setSaisie] = useState("");
  const [ongletActif, setOngletActif] = useState(tutor.eleveIds[0]);

  useEffect(() => {
    const aLire = messages
      .filter((m) => m.eleveId === ongletActif && m.repetiteurId === CURRENT_TUTOR_ID && m.auteur === "eleve" && !m.lu)
      .map((m) => m.id);
    if (aLire.length > 0) void marquerMessagesLus(aLire);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ongletActif, messages.length]);

  const demandes = demandesAide
    .filter((d) => tutor.eleveIds.includes(d.eleveId))
    .sort((a, b) => (a.statut === b.statut ? b.date.localeCompare(a.date) : a.statut === "ouverte" ? -1 : 1));

  function envoyer(eleveId: string) {
    if (!saisie.trim()) return;
    addMessage({
      eleveId,
      repetiteurId: CURRENT_TUTOR_ID,
      auteur: "repetiteur",
      contenu: saisie.trim(),
      date: new Date().toISOString(),
      lu: false,
    });
    setSaisie("");
  }

  function traiter(id: string) {
    updateDemandeAide(id, { statut: "traitee" });
    toast.success("Demande marquée traitée.");
  }

  if (tutor.eleveIds.length === 0) {
    return <EmptyState icon={Send} title="Aucun élève assigné" hint="Les messages de tes élèves apparaîtront ici une fois qu'on t'en aura assigné." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground">Échange avec tes élèves et leurs demandes d&apos;aide.</p>
      </div>

      {demandes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><HelpCircle className="size-4" /> Demandes d&apos;aide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {demandes.map((d) => {
              const eleve = getEleve(d.eleveId);
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-2 text-sm">
                  <span>
                    <span className="font-medium">{eleve?.prenom} {eleve?.nom}</span> — {getMatiere(d.matiereId)?.nom} : {d.sujet}
                  </span>
                  {d.statut === "ouverte" ? (
                    <Button size="sm" variant="outline" onClick={() => traiter(d.id)}>
                      <CheckCircle2 /> Marquer traitée
                    </Button>
                  ) : (
                    <Badge variant="secondary">Traitée</Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Tabs value={ongletActif} onValueChange={setOngletActif}>
        <TabsList>
          {tutor.eleveIds.map((id) => {
            const eleve = getEleve(id);
            return <TabsTrigger key={id} value={id}>{eleve?.prenom} {eleve?.nom}</TabsTrigger>;
          })}
        </TabsList>
        {tutor.eleveIds.map((eleveId) => (
          <TabsContent key={eleveId} value={eleveId} className="mt-4">
            <Card>
              <CardContent className="flex flex-col gap-4">
                <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                  {messages
                    .filter((m) => m.eleveId === eleveId && m.repetiteurId === CURRENT_TUTOR_ID)
                    .map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          m.auteur === "repetiteur" ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted"
                        }`}
                      >
                        {m.contenu}
                      </div>
                    ))}
                  {messages.filter((m) => m.eleveId === eleveId && m.repetiteurId === CURRENT_TUTOR_ID).length === 0 && (
                    <EmptyState icon={Send} title="Aucun message pour l'instant" hint="Écris le premier message, ton élève le verra." />
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={saisie}
                    onChange={(e) => setSaisie(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && envoyer(eleveId)}
                    placeholder="Écris ton message..."
                  />
                  <Button size="icon" onClick={() => envoyer(eleveId)}>
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
