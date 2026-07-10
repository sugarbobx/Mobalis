import { ShieldCheck, ShieldQuestion } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/server";
import { CreateAccountButton } from "./create-account-button";
import type { Role } from "./actions";

type Row = { id: string; nom: string; prenom: string; email: string | null; user_id: string | null };

export default async function AdminAccountsPage() {
  const supabase = await createClient();
  const [{ data: repetiteurs }, { data: parents }, { data: eleves }] = await Promise.all([
    supabase.from("repetiteurs").select("id, nom, prenom, email, user_id").order("nom"),
    supabase.from("parents").select("id, nom, prenom, email, user_id").order("nom"),
    supabase.from("eleves").select("id, nom, prenom, email, user_id").order("nom"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Comptes de connexion</h1>
        <p className="text-sm text-muted-foreground">
          Crée les identifiants de connexion pour chaque répétiteur, parent ou élève — à transmettre ensuite en personne.
        </p>
      </div>

      <RoleSection title="Répétiteurs" role="repetiteur" rows={repetiteurs ?? []} />
      <RoleSection title="Parents" role="parent" rows={parents ?? []} />
      <RoleSection title="Élèves" role="eleve" rows={eleves ?? []} />
    </div>
  );
}

function RoleSection({ title, role, rows }: { title: string; role: Role; rows: Row[] }) {
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
            {rows.map((row) => (
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
      </CardContent>
    </Card>
  );
}
