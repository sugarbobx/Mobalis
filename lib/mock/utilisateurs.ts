import type { Admin, Eleve, Parent, Repetiteur } from "./types";

export const admin: Admin = {
  id: "admin1",
  nom: "Girard",
  prenom: "Sophie",
};

export const repetiteurs: Repetiteur[] = [
  {
    id: "t1",
    nom: "Bernard",
    prenom: "Julien",
    matiereIds: ["5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", "f7404080-e582-4260-920a-ae6b042cb019"],
    eleveIds: ["e1", "e2", "e4"],
    avatarInitiales: "JB",
  },
  {
    id: "t2",
    nom: "Fontaine",
    prenom: "Camille",
    matiereIds: ["09350be0-60d8-4e91-8d96-af91e4175c2c", "b21ba26b-4833-4b57-914d-ff9ead59c194"],
    eleveIds: ["e1", "e3"],
    avatarInitiales: "CF",
  },
  {
    id: "t3",
    nom: "Leroy",
    prenom: "Thomas",
    matiereIds: ["5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", "b21ba26b-4833-4b57-914d-ff9ead59c194"],
    eleveIds: ["e2", "e3", "e4"],
    avatarInitiales: "TL",
  },
];

const PREFS_NOTIF_DEFAUT = { notes: true, absences: true, remarques: false, paiements: false, frequence: "immediat" as const };

// Seed data only — préférences de notification consultées/modifiées via @/lib/store's useStore().
export const parentsSeed: Parent[] = [
  { id: "p1", nom: "Moreau", prenom: "Isabelle", email: "isabelle.moreau@mail.com", eleveIds: ["e1"], preferencesNotification: { ...PREFS_NOTIF_DEFAUT } },
  { id: "p2", nom: "Dubois", prenom: "Marc", email: "marc.dubois@mail.com", eleveIds: ["e2", "e3"], preferencesNotification: { ...PREFS_NOTIF_DEFAUT, remarques: true } },
  { id: "p3", nom: "Petit", prenom: "Nathalie", email: "nathalie.petit@mail.com", eleveIds: ["e4"], preferencesNotification: { ...PREFS_NOTIF_DEFAUT, frequence: "hebdomadaire" } },
];

// e1, e2, e4 : entrée standard à la rentrée officielle.
// e3 : entrée non-standard, directement en Tle en cours d'année (cas §2.1/2.2).
export const eleves: Eleve[] = [
  {
    id: "e1",
    nom: "Moreau",
    prenom: "Lucas",
    classe: "2nde",
    serie: "C",
    styleApprentissage: "Visuel",
    parentIds: ["p1"],
    repetiteurIds: ["t1", "t2"],
    matiereIds: ["5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", "f7404080-e582-4260-920a-ae6b042cb019", "09350be0-60d8-4e91-8d96-af91e4175c2c"],
    avatarInitiales: "LM",
    dateEntree: "2025-09-02",
    classeEntree: "2nde",
    statutCompte: "actif",
  },
  {
    id: "e2",
    nom: "Dubois",
    prenom: "Emma",
    classe: "1ère",
    serie: "D",
    styleApprentissage: "Auditif",
    parentIds: ["p2"],
    repetiteurIds: ["t1", "t3"],
    matiereIds: ["5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", "b21ba26b-4833-4b57-914d-ff9ead59c194"],
    avatarInitiales: "ED",
    dateEntree: "2025-09-02",
    classeEntree: "1ère",
    statutCompte: "actif",
  },
  {
    id: "e3",
    nom: "Dubois",
    prenom: "Noah",
    classe: "Tle",
    serie: "D",
    styleApprentissage: "Kinesthésique",
    parentIds: ["p2"],
    repetiteurIds: ["t2", "t3"],
    matiereIds: ["09350be0-60d8-4e91-8d96-af91e4175c2c", "b21ba26b-4833-4b57-914d-ff9ead59c194"],
    avatarInitiales: "ND",
    dateEntree: "2026-01-12",
    classeEntree: "Tle",
    historiqueExterne: "Ancien élève d'un autre centre — bulletin de 1ère : moyenne générale 11.5/20, points faibles en SVT.",
    statutCompte: "actif",
  },
  {
    id: "e4",
    nom: "Petit",
    prenom: "Chloé",
    classe: "Tle",
    serie: "D",
    styleApprentissage: "Visuel",
    parentIds: ["p3"],
    repetiteurIds: ["t1", "t3"],
    matiereIds: ["5248cb2a-8e6d-4fd3-a428-8bf50e11d22b", "f7404080-e582-4260-920a-ae6b042cb019", "b21ba26b-4833-4b57-914d-ff9ead59c194"],
    avatarInitiales: "CP",
    dateEntree: "2023-09-04",
    classeEntree: "2nde",
    statutCompte: "actif",
  },
];

export function getEleve(id: string): Eleve | undefined {
  return eleves.find((e) => e.id === id);
}

export function getRepetiteur(id: string): Repetiteur | undefined {
  return repetiteurs.find((t) => t.id === id);
}

export function getParent(id: string): Parent | undefined {
  return parentsSeed.find((p) => p.id === id);
}
