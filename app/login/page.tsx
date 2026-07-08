"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE_TABLES = [
  { table: "admins", href: "/admin" },
  { table: "repetiteurs", href: "/tutor" },
  { table: "parents", href: "/parent" },
  { table: "eleves", href: "/student" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      toast.error(authError?.message ?? "Échec de connexion");
      setLoading(false);
      return;
    }

    const userId = authData.user.id;
    // Self-select RLS policies only expose the caller's own row, so trying
    // each role table and keeping the one that returns data tells us which
    // role this account belongs to.
    const results = await Promise.all(
      ROLE_TABLES.map(({ table }) =>
        supabase.from(table).select("id").eq("user_id", userId).maybeSingle()
      )
    );
    const matchIndex = results.findIndex((r) => r.data);

    if (matchIndex === -1) {
      toast.error("Compte authentifié mais aucun profil associé. Contactez l'administrateur.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.push(ROLE_TABLES[matchIndex].href);
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>Accédez à votre espace MOBALIS.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
