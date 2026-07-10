"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";

/**
 * Bloque l'espace parent tant que la politique de confidentialité (données
 * d'un mineur) n'a pas été acceptée — une seule fois, à la première visite.
 */
export function ConsentGate({ children }: { children: React.ReactNode }) {
  const { getParent, accepterConsentement } = useStore();
  const parentId = useCurrentUser().id;
  const parent = getParent(parentId);
  const [envoi, setEnvoi] = useState(false);

  async function accepter() {
    setEnvoi(true);
    try {
      await accepterConsentement(parentId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setEnvoi(false);
    }
  }

  // Tant que les données ne sont pas encore chargées, ne rien bloquer —
  // évite un flash de la modale au premier rendu.
  if (!parent || parent.consentementAccepteAt) return <>{children}</>;

  return (
    <>
      {children}
      <Dialog open>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Avant de continuer</DialogTitle>
            <DialogDescription>
              Mobalis traite des données concernant ton enfant (mineur). Merci de prendre connaissance de notre politique de confidentialité avant de poursuivre.
            </DialogDescription>
          </DialogHeader>
          <Link href="/politique-confidentialite" target="_blank" className="text-sm text-primary underline-offset-4 hover:underline">
            Lire la politique de confidentialité
          </Link>
          <DialogFooter>
            <Button onClick={accepter} disabled={envoi}>
              {envoi ? "Enregistrement..." : "J'ai lu et j'accepte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
