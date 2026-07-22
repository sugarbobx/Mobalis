/**
 * Date locale au format YYYY-MM-DD — jamais `d.toISOString().slice(0, 10)`,
 * qui convertit en UTC avant de tronquer et peut renvoyer la veille selon le
 * fuseau (ex. WAT/UTC+1 entre 00h et 01h locale, où l'UTC est encore sur le
 * jour précédent). À utiliser partout où une valeur représente une DATE
 * calendaire locale (colonnes `date` en base, comparaisons "aujourd'hui")
 * plutôt qu'un instant précis (auquel cas .toISOString() complet reste correct).
 */
export function dateLocaleISO(d: Date): string {
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}
