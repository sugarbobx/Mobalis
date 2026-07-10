"use client";

import { createClient } from "@/utils/supabase/client";

export type TypeNotification = "note" | "absence" | "remarque" | "paiement";
export type StatutNotification = "en_attente" | "envoye_mock" | "echec";

export interface Notification {
  id: string;
  type: TypeNotification;
  canal: string;
  contenu: string;
  statut: StatutNotification;
  createdAt: string;
  envoyeAt: string | null;
}

export interface NotificationCentre extends Notification {
  elevePrenom: string;
  eleveNom: string;
}

function mapNotification(r: Record<string, unknown>): Notification {
  return {
    id: r.id as string,
    type: r.type as TypeNotification,
    canal: r.canal as string,
    contenu: r.contenu as string,
    statut: r.statut as StatutNotification,
    createdAt: r.created_at as string,
    envoyeAt: (r.envoye_at as string | null) ?? null,
  };
}

export async function getMesNotifications(): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_mes_notifications");
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapNotification);
}

export async function getNotificationsCentre(): Promise<NotificationCentre[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_notifications_centre");
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    ...mapNotification(r),
    elevePrenom: r.eleve_prenom as string,
    eleveNom: r.eleve_nom as string,
  }));
}

/** Mock : marque les notifs en attente comme envoyées. À remplacer par un vrai appel API plus tard. */
export async function envoyerEnAttente(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("envoyer_notifications_en_attente");
  if (error) throw new Error(error.message);
  return data as number;
}
