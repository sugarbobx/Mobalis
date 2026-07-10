"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { creerCentre } from "./actions";

export default function InscriptionPage() {
  const [nomCentre, setNomCentre] = useState("");
  const [ville, setVille] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  const formValide =
    nomCentre.trim().length > 0 && prenom.trim().length > 0 && nom.trim().length > 0 && email.trim().length > 0 && password.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValide) return;
    setLoading(true);
    setErreur(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Compte non créé — réessaie.");

      await creerCentre(nomCentre, ville, data.user.id, email, nom, prenom);
      setSucces(true);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Échec de l'inscription.");
    } finally {
      setLoading(false);
    }
  }

  if (succes) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <MailCheck className="mb-4 size-12 text-primary" />
        <h1 className="text-xl font-semibold">Vérifie ta boîte mail</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Ton centre « {nomCentre} » a été créé. Confirme ton adresse email pour activer ton compte, puis connecte-toi.
        </p>
        <Link href="/login" className="mt-6 text-sm text-primary underline-offset-4 hover:underline">
          Aller à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Créer un compte pour ton centre</CardTitle>
          <CardDescription>Quelques informations pour démarrer — ton espace d&apos;administration sera prêt immédiatement.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nom-centre">Nom du centre</Label>
              <Input id="nom-centre" value={nomCentre} onChange={(e) => setNomCentre(e.target.value)} placeholder="Ex. Centre Excellence" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ex. Douala" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <p className="text-xs text-muted-foreground">6 caractères minimum.</p>
            </div>
            {erreur && <p className="text-sm text-destructive">{erreur}</p>}
            <Button type="submit" className="w-full" disabled={!formValide || loading}>
              {loading ? "Création..." : "Créer mon centre"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              En créant ce compte, tu acceptes notre{" "}
              <Link href="/politique-confidentialite" className="underline underline-offset-4">politique de confidentialité</Link>.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
