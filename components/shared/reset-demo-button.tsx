"use client";

import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resetDemo } from "@/lib/store";

export function ResetDemoButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={() => {
        resetDemo();
        toast.success("Données de démonstration réinitialisées");
      }}
    >
      <RotateCcw />
      Réinitialiser la démo
    </Button>
  );
}
