"use client";

import { useEffect, useState } from "react";
import { Bell, Clock, Send, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getNotificationsCentre, envoyerEnAttente, type NotificationCentre } from "@/lib/notifications";

const TYPE_LABELS: Record<string, string> = { note: "Note", absence: "Absence", remarque: "Remarque", paiement: "Paiement" };

function formatDateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationCentre[]>([]);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    const data = await getNotificationsCentre();
    setNotifications(data);
    setChargement(false);
  }

  useEffect(() => {
    void charger();
  }, []);

  const enAttente = notifications.filter((n) => n.statut === "en_attente");
  const envoyeesCeMois = notifications.filter((n) => {
    if (n.statut !== "envoye_mock" || !n.envoyeAt) return false;
    const d = new Date(n.envoyeAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  async function envoyer() {
    setEnvoi(true);
    try {
      const n = await envoyerEnAttente();
      toast.success(n > 0 ? `${n} notification(s) envoyée(s)` : "Rien à envoyer");
      void charger();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Déclenchées automatiquement à chaque note, absence, remarque ou paiement, selon les préférences de chaque parent.
          </p>
        </div>
        <Button onClick={envoyer} disabled={envoi || enAttente.length === 0}>
          <Send />
          {envoi ? "Envoi..." : `Envoyer les notifications en attente (${enAttente.length})`}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="En attente d'envoi" value={enAttente.length} icon={Clock} accent={enAttente.length > 0} />
        <StatCard label="Envoyées ce mois" value={envoyeesCeMois.length} icon={CheckCheck} />
        <StatCard label="Total (50 derniers jours)" value={notifications.length} icon={Bell} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journal des notifications</CardTitle>
          <CardDescription>
            Canal WhatsApp mocké — aucun message n&apos;est réellement envoyé tant qu&apos;un fournisseur SMS/WhatsApp n&apos;est pas activé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chargement ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : notifications.length === 0 ? (
            <EmptyState icon={Bell} title="Aucune notification" hint="Elles apparaîtront dès qu'une note, absence, remarque ou paiement sera enregistré." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Élève</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contenu</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.elevePrenom} {n.eleveNom}</TableCell>
                    <TableCell><Badge variant="outline">{TYPE_LABELS[n.type]}</Badge></TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">{n.contenu}</TableCell>
                    <TableCell>
                      {n.statut === "envoye_mock" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400">Envoyée</Badge>
                      ) : n.statut === "echec" ? (
                        <Badge className="bg-red-500/15 text-red-400">Échec</Badge>
                      ) : (
                        <Badge variant="outline">En attente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateHeure(n.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
