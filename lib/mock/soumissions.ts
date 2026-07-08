import type { Soumission } from "./types";

// Seed data only — consume via @/lib/store's useStore().
export const soumissionsSeed: Soumission[] = [
  { id: "sub1", assignationId: "a3", eleveId: "e1", reponseQcm: [0, 2], date: "2026-06-24", statut: "auto_corrige", scoreAuto: 100, scoreFinal: 100 },
  { id: "sub2", assignationId: "a4", eleveId: "e1", reponseQcm: [1, 1], date: "2026-06-19", statut: "auto_corrige", scoreAuto: 50, scoreFinal: 50 },
  {
    id: "sub3",
    assignationId: "a2",
    eleveId: "e1",
    reponseLibre:
      "Initialisation : pour n=1, 1 = 1(2)/2 = 1, la propriété est vraie. Hérédité : on suppose la propriété vraie au rang n, on montre qu'elle est vraie au rang n+1 en ajoutant (n+1) de chaque côté. Conclusion : par le principe de récurrence, la propriété est vraie pour tout entier naturel n.",
    date: "2026-06-19",
    statut: "en_attente_correction",
  },
  {
    id: "sub4",
    assignationId: "a5",
    eleveId: "e1",
    reponseLibre:
      "Last summer, I went to Portugal with my family. We visited Lisbon and Porto, the weather was amazing and the food was delicious. I really enjoyed the beaches and the local culture.",
    date: "2026-06-14",
    statut: "corrige_manuellement",
    scoreFinal: 80,
    commentaireCorrection: "Bon vocabulaire, attention aux temps du passé (preterit vs present perfect).",
  },
  { id: "sub5", assignationId: "a7", eleveId: "e2", reponseQcm: [1], date: "2026-06-19", statut: "auto_corrige", scoreAuto: 100, scoreFinal: 100 },
  {
    id: "sub6",
    assignationId: "a9",
    eleveId: "e3",
    reponseLibre: "La fécondation a lieu dans les trompes puis l'œuf migre vers l'utérus où il se nide dans la paroi (nidation).",
    date: "2026-06-27",
    statut: "en_attente_correction",
  },
  { id: "sub7", assignationId: "a10", eleveId: "e4", reponseQcm: [0, 2], date: "2026-06-29", statut: "auto_corrige", scoreAuto: 100, scoreFinal: 100 },
];
