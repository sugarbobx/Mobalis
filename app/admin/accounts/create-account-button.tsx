"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { creerCompte, type Role } from "./actions";

function genererMotDePasse() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
}

export function CreateAccountButton({
  role,
  profileId,
  nom,
  prenom,
  email: emailInitial,
}: {
  role: Role;
  profileId: string;
  nom: string;
  prenom: string;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(emailInitial ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      await creerCompte(role, profileId, email.trim(), password);
      toast.success(`Compte créé pour ${prenom} ${nom}`);
      setOpen(false);
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de création du compte");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <KeyRound />
        Créer un compte
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Créer un compte — {prenom} {nom}</DialogTitle>
          <DialogDescription>Identifiants de connexion à transmettre à la personne concernée.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type={motDePasseVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setMotDePasseVisible((v) => !v)}>
                {motDePasseVisible ? <EyeOff /> : <Eye />}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPassword(genererMotDePasse())}>
                Générer
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || !email.trim() || !password.trim()}>
            {loading ? "Création..." : "Créer le compte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
