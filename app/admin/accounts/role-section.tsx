"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateAccountButton } from "./create-account-button";
import type { Role } from "./actions";
import type { Row } from "./page";

const PAR_PAGE = 20;

export function RoleSection({ title, role, rows }: { title: string; role: Role; rows: Row[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAR_PAGE));
  const pageActuelle = Math.min(page, totalPages);
  const rowsPage = rows.slice((pageActuelle - 1) * PAR_PAGE, pageActuelle * PAR_PAGE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{rows.filter((r) => r.user_id).length}/{rows.length} comptes créés</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowsPage.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.prenom} {row.nom}</TableCell>
                <TableCell className="text-muted-foreground">{row.email ?? "—"}</TableCell>
                <TableCell>
                  {row.user_id ? (
                    <Badge className="gap-1 bg-emerald-500/15 text-emerald-400">
                      <ShieldCheck className="size-3.5" /> Compte créé
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <ShieldQuestion className="size-3.5" /> Pas de compte
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!row.user_id && (
                    <CreateAccountButton role={role} profileId={row.id} nom={row.nom} prenom={row.prenom} email={row.email} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pageActuelle} / {totalPages} — {rows.length} comptes
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={pageActuelle === 1}
                onClick={() => setPage(pageActuelle - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  variant={n === pageActuelle ? "default" : "outline"}
                  size="icon"
                  className="size-8"
                  onClick={() => setPage(n)}
                >
                  {n}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={pageActuelle === totalPages}
                onClick={() => setPage(pageActuelle + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
