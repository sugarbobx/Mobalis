"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { genererBulletinSequencePdf } from "@/app/actions/bulletin-pdf";

export function BulletinDownloadButton({ eleveId, sequenceId }: { eleveId: string; sequenceId: string }) {
  const [loading, setLoading] = useState(false);

  async function telecharger() {
    setLoading(true);
    try {
      const { url } = await genererBulletinSequencePdf(eleveId, sequenceId);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la génération du PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={telecharger} disabled={loading}>
      <Download /> {loading ? "Génération…" : "Télécharger le PDF"}
    </Button>
  );
}
