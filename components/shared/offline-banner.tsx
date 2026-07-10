"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/use-online-status";
import { useStore } from "@/lib/store";

function formatSync(iso: string | null): string {
  if (!iso) return "jamais synchronisé";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function OfflineBanner() {
  const online = useOnlineStatus();
  const { derniereSyncAt } = useStore();

  if (online) return null;

  return (
    <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
      <WifiOff className="size-4 shrink-0" />
      Hors ligne — données du {formatSync(derniereSyncAt)}. Les défis, la révision et les modifications sont indisponibles tant que la connexion n&apos;est pas rétablie.
    </div>
  );
}
