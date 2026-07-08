"use client";

import { CreditCard, GraduationCap, Users, BookOpen } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { repetiteurs, paiements, getRepetiteur } from "@/lib/mock";
import { useStore } from "@/lib/store";

export default function AdminDashboardPage() {
  const { eleves, parents, matieres, getMatiere, getMatieresActives, getEleve, getParent } = useStore();
  const matieresActives = getMatieresActives();
  const paiementsEnAttente = paiements.filter((p) => p.statut === "en_attente" || p.statut === "en_retard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d&apos;ensemble du centre MOBALIS.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Élèves inscrits" value={eleves.length} icon={GraduationCap} accent />
        <StatCard label="Répétiteurs actifs" value={repetiteurs.length} icon={Users} />
        <StatCard label="Matières actives" value={matieresActives.length} icon={BookOpen} hint={`sur ${matieres.length} au total`} />
        <StatCard
          label="Paiements à traiter"
          value={paiementsEnAttente.length}
          icon={CreditCard}
          hint="en attente ou en retard"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Élève</TableHead>
                <TableHead>Classe / Série</TableHead>
                <TableHead>Entrée</TableHead>
                <TableHead>Matières suivies</TableHead>
                <TableHead>Répétiteur(s)</TableHead>
                <TableHead>Parent(s)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eleves.map((eleve) => (
                <TableRow key={eleve.id}>
                  <TableCell className="font-medium">{eleve.prenom} {eleve.nom}</TableCell>
                  <TableCell>{eleve.classe} · {eleve.serie}</TableCell>
                  <TableCell>
                    <span title={eleve.historiqueExterne} className="text-sm text-muted-foreground">
                      {eleve.dateEntree}
                      {eleve.classeEntree !== "2nde" && ` (direct ${eleve.classeEntree})`}
                      {eleve.historiqueExterne && " *"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {eleve.matiereIds.map((id) => (
                        <Badge key={id} variant="secondary">{getMatiere(id)?.nom}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {eleve.repetiteurIds.map((id) => getRepetiteur(id)).map((r) => r && `${r.prenom} ${r.nom}`).join(", ")}
                  </TableCell>
                  <TableCell>
                    {eleve.parentIds.map((id) => getParent(id)).map((p) => p && `${p.prenom} ${p.nom}`).join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignation des répétiteurs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Répétiteur</TableHead>
                <TableHead>Matières enseignées</TableHead>
                <TableHead>Élèves suivis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repetiteurs.map((rep) => (
                <TableRow key={rep.id}>
                  <TableCell className="font-medium">{rep.prenom} {rep.nom}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rep.matiereIds.map((id) => (
                        <Badge key={id} variant="secondary">{getMatiere(id)?.nom}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rep.eleveIds.map((id) => getEleve(id)).map((e) => e && `${e.prenom} ${e.nom}`).join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suivi global des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Élève</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((paiement) => {
                  const eleve = getEleve(paiement.eleveId);
                  const parent = parents.find((p) => p.id === paiement.parentId);
                  return (
                    <TableRow key={paiement.id}>
                      <TableCell className="font-medium">{eleve && `${eleve.prenom} ${eleve.nom}`}</TableCell>
                      <TableCell>{parent && `${parent.prenom} ${parent.nom}`}</TableCell>
                      <TableCell>{paiement.motif}</TableCell>
                      <TableCell>{paiement.montant} €</TableCell>
                      <TableCell>{paiement.date}</TableCell>
                      <TableCell><StatusBadge status={paiement.statut} /></TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
