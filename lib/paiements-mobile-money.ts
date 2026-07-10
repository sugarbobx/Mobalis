"use client";

import { createClient } from "@/utils/supabase/client";

export type MethodePaiement = "mtn" | "orange";

export interface ConfirmationPaiement {
  reference: string;
  methode: MethodePaiement;
}

/**
 * MOCK — simule l'appel à un agrégateur mobile money (CinetPay, Flutterwave,
 * NotchPay...) qui déclencherait un push USSD réel vers le téléphone du
 * parent. C'est la SEULE fonction à réécrire pour brancher un vrai compte
 * marchand : remplacer le corps par l'appel API réel, garder la signature.
 * L'écriture en base (RPC confirmer_paiement_mock, migration 0009) reste
 * valable telle quelle — seul le "y a-t-il vraiment eu paiement" change.
 */
export async function confirmerPaiement(paiementId: string, methode: MethodePaiement): Promise<ConfirmationPaiement> {
  // Délai simulé — un vrai push USSD prend quelques secondes.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const supabase = createClient();
  const { data, error } = await supabase.rpc("confirmer_paiement_mock", {
    p_paiement_id: paiementId,
    p_methode: methode,
  });
  if (error || !data) throw new Error(error?.message ?? "Échec de la confirmation du paiement.");
  return { reference: data.reference as string, methode: data.methode as MethodePaiement };
}
