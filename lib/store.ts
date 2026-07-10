"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/utils/supabase/client";
import type {
  Matiere,
  Repetiteur,
  Parent,
  Eleve,
  Classe,
  Seance,
  Evaluation,
  Paiement,
  Exercice,
  Assignation,
  Soumission,
  Ressource,
  Message,
  DemandeAide,
  Badge,
  BadgeObtenu,
  Objectif,
  AutoEvaluation,
  PreferencesNotification,
  Bulletin,
  PassageClasse,
  SuggestionReorientation,
  ResultatBac,
  Serie,
} from "./mock/types";

/**
 * Single client-side source of truth for every entity in the app. Backed
 * entirely by Supabase (Postgres + RLS) — fetchAll() below loads everything
 * once per page load, and every mutating action writes through to Supabase
 * first before patching local state. A localStorage snapshot is kept purely
 * for offline reading (Phase 1, see requireOnlineClient/hydrateFromCache) —
 * it is never the source of truth, Supabase always wins once reachable.
 * This hook intentionally does NOT reach into Server Components — pages
 * that need this data are Client Components using useStore().
 */
export interface StoreState {
  matieres: Matiere[];
  repetiteurs: Repetiteur[];
  parents: Parent[];
  eleves: Eleve[];
  seances: Seance[];
  evaluations: Evaluation[];
  paiements: Paiement[];
  exercices: Exercice[];
  assignations: Assignation[];
  soumissions: Soumission[];
  ressources: Ressource[];
  messages: Message[];
  demandesAide: DemandeAide[];
  badges: Badge[];
  badgesObtenus: BadgeObtenu[];
  objectifs: Objectif[];
  autoEvaluations: AutoEvaluation[];
  bulletins: Bulletin[];
  passagesClasse: PassageClasse[];
  suggestionsReorientation: SuggestionReorientation[];
  resultatsBac: ResultatBac[];
  /** Horodatage du dernier fetchAll() réussi — null tant qu'aucun n'a abouti. */
  derniereSyncAt: string | null;
}

const CLASSE_DB_TO_APP: Record<string, Classe> = { "2nde": "2nde", "1ere": "1ère", tle: "Tle" };
const CLASSE_APP_TO_DB: Record<Classe, string> = { "2nde": "2nde", "1ère": "1ere", Tle: "tle" };

function emptyState(): StoreState {
  return {
    matieres: [],
    repetiteurs: [],
    parents: [],
    eleves: [],
    seances: [],
    evaluations: [],
    paiements: [],
    exercices: [],
    assignations: [],
    soumissions: [],
    ressources: [],
    messages: [],
    demandesAide: [],
    badges: [],
    badgesObtenus: [],
    objectifs: [],
    autoEvaluations: [],
    bulletins: [],
    passagesClasse: [],
    suggestionsReorientation: [],
    resultatsBac: [],
    derniereSyncAt: null,
  };
}

function createStore(initial: StoreState) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState: (updater: (prev: StoreState) => StoreState) => {
      state = updater(state);
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const store = createStore(emptyState());

// Offline Phase 1 (lecture seule) : dernier fetchAll() réussi mis en cache
// pour rester consultable hors connexion. Ne cache jamais les défis/révision
// (hors du store, voir lib/defis.ts et lib/revision.ts — leur anti-triche
// dépend de RPC serveur, aucune valeur à mettre en cache côté client).
const OFFLINE_CACHE_KEY = "mobalis-offline-v1";

let hydrateAttempted = false;
function hydrateFromCache() {
  if (hydrateAttempted) return;
  hydrateAttempted = true;
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
    if (!raw) return;
    const cached = JSON.parse(raw) as Partial<StoreState>;
    // Rejette un cache d'une forme antérieure (clé manquante après une
    // migration de schéma côté app) plutôt que de risquer un état incomplet.
    const complete = Object.keys(emptyState()).every(
      (key) => key === "derniereSyncAt" || Array.isArray(cached[key as keyof StoreState])
    );
    if (complete) {
      store.setState(() => cached as StoreState);
    } else {
      localStorage.removeItem(OFFLINE_CACHE_KEY);
    }
  } catch {
    localStorage.removeItem(OFFLINE_CACHE_KEY);
  }
}

function persistToCache(state: StoreState) {
  try {
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(state));
  } catch {
    // stockage plein/indisponible — l'app continue de fonctionner en ligne
  }
}

// Bloque les écritures quand le navigateur se sait hors ligne — message
// clair plutôt qu'un échec réseau confus. Les lectures (fetchAll) passent
// par le même point pour échouer vite plutôt que de pendre.
function requireOnlineClient() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Action impossible hors ligne — réessaie une fois connecté.");
  }
  return createClient();
}

// --- row -> app-shape mappers (DB is snake_case, app is camelCase) ---
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const mapMatiere = (r: Row): Matiere => ({ id: r.id, nom: r.nom, statut: r.statut, couleur: r.couleur, series: r.series });

const mapRepetiteur = (r: Row): Repetiteur => ({
  id: r.id,
  nom: r.nom,
  prenom: r.prenom,
  avatarInitiales: r.avatar_initiales,
  matiereIds: (r.repetiteur_matieres ?? []).map((x: Row) => x.matiere_id),
  eleveIds: (r.eleve_repetiteurs ?? []).map((x: Row) => x.eleve_id),
});

const mapParent = (r: Row): Parent => ({
  id: r.id,
  nom: r.nom,
  prenom: r.prenom,
  email: r.email,
  eleveIds: (r.eleve_parents ?? []).map((x: Row) => x.eleve_id),
  preferencesNotification: {
    notes: r.pref_notif_notes,
    absences: r.pref_notif_absences,
    remarques: r.pref_notif_remarques,
    paiements: r.pref_notif_paiements,
    frequence: r.pref_notif_frequence,
  },
  consentementAccepteAt: r.consentement_accepte_at ?? null,
});

const mapEleve = (r: Row): Eleve => ({
  id: r.id,
  nom: r.nom,
  prenom: r.prenom,
  classe: CLASSE_DB_TO_APP[r.classe],
  serie: r.serie,
  styleApprentissage: r.style_apprentissage,
  parentIds: (r.eleve_parents ?? []).map((x: Row) => x.parent_id),
  repetiteurIds: (r.eleve_repetiteurs ?? []).map((x: Row) => x.repetiteur_id),
  matiereIds: (r.eleve_matieres ?? []).map((x: Row) => x.matiere_id),
  avatarInitiales: r.avatar_initiales,
  dateEntree: r.date_entree,
  classeEntree: CLASSE_DB_TO_APP[r.classe_entree],
  historiqueExterne: r.historique_externe ?? undefined,
  statutCompte: r.statut_compte,
});

const mapSeance = (r: Row): Seance => ({
  id: r.id,
  eleveId: r.eleve_id,
  repetiteurId: r.repetiteur_id,
  matiereId: r.matiere_id,
  date: r.date,
  heureDebut: r.heure_debut,
  heureFin: r.heure_fin,
  lieu: r.lieu,
  statut: r.statut,
  contenu: r.contenu ?? undefined,
  present: r.present ?? undefined,
  anneeScolaire: r.annee_scolaire,
});

const mapEvaluation = (r: Row): Evaluation => ({
  id: r.id,
  eleveId: r.eleve_id,
  repetiteurId: r.repetiteur_id,
  matiereId: r.matiere_id,
  date: r.date,
  note: r.note,
  remarque: r.remarque,
  visibleEleve: r.visible_eleve,
  anneeScolaire: r.annee_scolaire,
  sequenceId: r.sequence_id ?? null,
});

const mapPaiement = (r: Row): Paiement => ({
  id: r.id,
  parentId: r.parent_id,
  eleveId: r.eleve_id,
  montant: r.montant,
  date: r.date,
  motif: r.motif,
  statut: r.statut,
});

const mapExercice = (r: Row): Exercice => ({
  id: r.id,
  matiereId: r.matiere_id,
  type: r.type,
  titre: r.titre,
  consigne: r.consigne,
  createur: r.createur,
  createurId: r.createur_id,
  questions: r.questions ?? undefined,
  enonce: r.enonce ?? undefined,
  dansBibliotheque: r.dans_bibliotheque,
});

const mapAssignation = (r: Row): Assignation => ({
  id: r.id,
  exerciceId: r.exercice_id,
  eleveIds: (r.assignation_eleves ?? []).map((x: Row) => x.eleve_id),
  repetiteurAssignantId: r.repetiteur_assignant_id,
  dateAssignation: r.date_assignation,
  dateEcheance: r.date_echeance,
  statut: r.statut,
  score: r.score ?? undefined,
});

const mapSoumission = (r: Row): Soumission => ({
  id: r.id,
  assignationId: r.assignation_id,
  eleveId: r.eleve_id,
  reponseQcm: r.reponse_qcm ?? undefined,
  reponseLibre: r.reponse_libre ?? undefined,
  date: r.date,
  statut: r.statut,
  scoreAuto: r.score_auto ?? undefined,
  scoreFinal: r.score_final ?? undefined,
  commentaireCorrection: r.commentaire_correction ?? undefined,
});

const mapRessource = (r: Row): Ressource => ({
  id: r.id,
  matiereId: r.matiere_id,
  titre: r.titre,
  type: r.type,
  seanceId: r.seance_id ?? undefined,
  description: r.description,
});

const mapMessage = (r: Row): Message => ({
  id: r.id,
  eleveId: r.eleve_id,
  repetiteurId: r.repetiteur_id,
  auteur: r.auteur,
  contenu: r.contenu,
  date: r.date,
  lu: r.lu,
});

const mapDemandeAide = (r: Row): DemandeAide => ({
  id: r.id,
  eleveId: r.eleve_id,
  matiereId: r.matiere_id,
  sujet: r.sujet,
  date: r.date,
  statut: r.statut,
});

const mapBadge = (r: Row): Badge => ({ id: r.id, code: r.code, nom: r.nom, description: r.description, icone: r.icone });
const mapBadgeObtenu = (r: Row): BadgeObtenu => ({ badgeId: r.badge_id, eleveId: r.eleve_id, date: r.date });

const mapObjectif = (r: Row): Objectif => ({
  id: r.id,
  eleveId: r.eleve_id,
  repetiteurId: r.repetiteur_id,
  matiereId: r.matiere_id,
  titre: r.titre,
  progression: r.progression,
  dateEcheance: r.date_echeance,
});

const mapAutoEvaluation = (r: Row): AutoEvaluation => ({
  id: r.id,
  eleveId: r.eleve_id,
  seanceId: r.seance_id,
  moment: r.moment,
  chapitre: r.chapitre,
  ressenti: r.ressenti,
  date: r.date,
});

const mapBulletin = (r: Row): Bulletin => ({
  id: r.id,
  eleveId: r.eleve_id,
  anneeScolaire: r.annee_scolaire,
  moyennesParMatiere: (r.bulletin_moyennes ?? []).map((x: Row) => ({ matiereId: x.matiere_id, moyenne: x.moyenne })),
  moyenneGenerale: r.moyenne_generale,
  appreciationGenerale: r.appreciation_generale,
});

const mapPassageClasse = (r: Row): PassageClasse => ({
  id: r.id,
  eleveId: r.eleve_id,
  anneeScolaire: r.annee_scolaire,
  classeActuelle: CLASSE_DB_TO_APP[r.classe_actuelle],
  classeSuivante: CLASSE_DB_TO_APP[r.classe_suivante],
  statut: r.statut,
  moyenneGenerale: r.moyenne_generale,
});

const mapSuggestion = (r: Row): SuggestionReorientation => ({
  id: r.id,
  eleveId: r.eleve_id,
  anneeScolaire: r.annee_scolaire,
  serieActuelle: r.serie_actuelle,
  serieSuggeree: r.serie_suggeree,
  motif: r.motif,
  transmiseAuParent: r.transmise_au_parent,
});

const mapResultatBac = (r: Row): ResultatBac => ({
  eleveId: r.eleve_id,
  anneeScolaire: r.annee_scolaire,
  obtenu: r.obtenu,
  mention: r.mention ?? undefined,
});

// Fetched once per page load.
let fetchAttempted = false;
async function fetchAll() {
  if (fetchAttempted) return;
  fetchAttempted = true;
  const supabase = requireOnlineClient();

  const [
    matieres,
    repetiteurs,
    parents,
    eleves,
    seances,
    evaluations,
    paiements,
    exercices,
    assignations,
    soumissions,
    ressources,
    messages,
    demandesAide,
    badges,
    badgesObtenus,
    objectifs,
    autoEvaluations,
    bulletins,
    passagesClasse,
    suggestionsReorientation,
    resultatsBac,
  ] = await Promise.all([
    supabase.from("matieres").select("id, nom, statut, couleur, series").order("nom"),
    supabase.from("repetiteurs").select("*, repetiteur_matieres(matiere_id), eleve_repetiteurs(eleve_id)"),
    supabase.from("parents").select("*, eleve_parents(eleve_id)"),
    supabase.from("eleves").select("*, eleve_parents(parent_id), eleve_repetiteurs(repetiteur_id), eleve_matieres(matiere_id)"),
    supabase.from("seances").select("*"),
    supabase.from("evaluations").select("*"),
    supabase.from("paiements").select("*"),
    supabase.from("exercices").select("*"),
    supabase.from("assignations").select("*, assignation_eleves(eleve_id)"),
    supabase.from("soumissions").select("*"),
    supabase.from("ressources").select("*"),
    supabase.from("messages").select("*"),
    supabase.from("demandes_aide").select("*"),
    supabase.from("badges").select("*"),
    supabase.from("badges_obtenus").select("*"),
    supabase.from("objectifs").select("*"),
    supabase.from("auto_evaluations").select("*"),
    supabase.from("bulletins").select("*, bulletin_moyennes(matiere_id, moyenne)"),
    supabase.from("passages_classe").select("*"),
    supabase.from("suggestions_reorientation").select("*"),
    supabase.from("resultats_bac").select("*"),
  ]);

  store.setState((prev) => {
    const next: StoreState = {
    ...prev,
    matieres: matieres.data ? matieres.data.map(mapMatiere) : prev.matieres,
    repetiteurs: repetiteurs.data ? repetiteurs.data.map(mapRepetiteur) : prev.repetiteurs,
    parents: parents.data ? parents.data.map(mapParent) : prev.parents,
    eleves: eleves.data ? eleves.data.map(mapEleve) : prev.eleves,
    seances: seances.data ? seances.data.map(mapSeance) : prev.seances,
    evaluations: evaluations.data ? evaluations.data.map(mapEvaluation) : prev.evaluations,
    paiements: paiements.data ? paiements.data.map(mapPaiement) : prev.paiements,
    exercices: exercices.data ? exercices.data.map(mapExercice) : prev.exercices,
    assignations: assignations.data ? assignations.data.map(mapAssignation) : prev.assignations,
    soumissions: soumissions.data ? soumissions.data.map(mapSoumission) : prev.soumissions,
    ressources: ressources.data ? ressources.data.map(mapRessource) : prev.ressources,
    messages: messages.data ? messages.data.map(mapMessage) : prev.messages,
    demandesAide: demandesAide.data ? demandesAide.data.map(mapDemandeAide) : prev.demandesAide,
    badges: badges.data ? badges.data.map(mapBadge) : prev.badges,
    badgesObtenus: badgesObtenus.data ? badgesObtenus.data.map(mapBadgeObtenu) : prev.badgesObtenus,
    objectifs: objectifs.data ? objectifs.data.map(mapObjectif) : prev.objectifs,
    autoEvaluations: autoEvaluations.data ? autoEvaluations.data.map(mapAutoEvaluation) : prev.autoEvaluations,
    bulletins: bulletins.data ? bulletins.data.map(mapBulletin) : prev.bulletins,
    passagesClasse: passagesClasse.data ? passagesClasse.data.map(mapPassageClasse) : prev.passagesClasse,
    suggestionsReorientation: suggestionsReorientation.data
      ? suggestionsReorientation.data.map(mapSuggestion)
      : prev.suggestionsReorientation,
    resultatsBac: resultatsBac.data ? resultatsBac.data.map(mapResultatBac) : prev.resultatsBac,
      derniereSyncAt: new Date().toISOString(),
    };
    persistToCache(next);
    return next;
  });
}

export function useStore() {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  useEffect(() => {
    hydrateFromCache();
    fetchAll().catch(() => {
      // hors ligne ou échec réseau — les données mises en cache (le cas
      // échéant) restent affichées, voir hydrateFromCache() ci-dessus.
    });
  }, []);

  const getMatiere = (id: string) => state.matieres.find((m) => m.id === id);
  const getRepetiteur = (id: string) => state.repetiteurs.find((r) => r.id === id);
  const getExercice = (id: string) => state.exercices.find((e) => e.id === id);
  const getAssignation = (id: string) => state.assignations.find((a) => a.id === id);
  const getSoumissionByAssignation = (assignationId: string, eleveId: string) =>
    state.soumissions.find((s) => s.assignationId === assignationId && s.eleveId === eleveId);

  const getDevoirsByEleve = (eleveId: string) =>
    state.assignations
      .filter((a) => a.eleveIds.includes(eleveId))
      .map((assignation) => {
        const exercice = getExercice(assignation.exerciceId)!;
        return {
          assignation,
          exercice,
          matiere: getMatiere(exercice.matiereId)!,
          soumission: getSoumissionByAssignation(assignation.id, eleveId),
        };
      });

  const getScoreMoyen = (eleveId: string): number | null => {
    // Exclut les exercices "diagnostic" : positionnement non noté formellement (§2.2/§3.3).
    const devoirs = getDevoirsByEleve(eleveId).filter(
      (d) => typeof d.assignation.score === "number" && d.exercice.type !== "diagnostic"
    );
    if (devoirs.length === 0) return null;
    const total = devoirs.reduce((acc, d) => acc + (d.assignation.score ?? 0), 0);
    return Math.round(total / devoirs.length);
  };

  return {
    ...state,

    // --- lookups (always read the current, possibly mutated, state) ---
    getMatiere,
    getMatieresActives: (serie?: Serie) => state.matieres.filter((m) => m.statut === "actif" && (!serie || m.series.includes(serie))),
    getRepetiteur,
    getExercice,
    getBibliotheque: () => state.exercices.filter((e) => e.dansBibliotheque),
    getExercicesByMatiere: (matiereId: string) => state.exercices.filter((e) => e.matiereId === matiereId),
    getAssignation,
    getAssignationsByEleve: (eleveId: string) => state.assignations.filter((a) => a.eleveIds.includes(eleveId)),
    getAssignationsByRepetiteur: (repId: string) => state.assignations.filter((a) => a.repetiteurAssignantId === repId),
    getSoumissionByAssignation,
    getSoumissionsEnAttente: () => state.soumissions.filter((s) => s.statut === "en_attente_correction"),
    getSeancesByEleve: (eleveId: string) =>
      state.seances.filter((s) => s.eleveId === eleveId).sort((a, b) => (a.date + a.heureDebut).localeCompare(b.date + b.heureDebut)),
    getSeancesByRepetiteur: (repId: string) =>
      state.seances.filter((s) => s.repetiteurId === repId).sort((a, b) => (a.date + a.heureDebut).localeCompare(b.date + b.heureDebut)),
    getEvaluationsByEleve: (eleveId: string) => state.evaluations.filter((e) => e.eleveId === eleveId).sort((a, b) => a.date.localeCompare(b.date)),
    getEvaluationsByMatiere: (eleveId: string, matiereId: string) =>
      state.evaluations
        .filter((e) => e.eleveId === eleveId && e.matiereId === matiereId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    getDevoirsByEleve,
    getScoreMoyen,
    getPaiementsByParent: (parentId: string) => state.paiements.filter((p) => p.parentId === parentId).sort((a, b) => b.date.localeCompare(a.date)),
    getPaiementsByEleve: (eleveId: string) => state.paiements.filter((p) => p.eleveId === eleveId).sort((a, b) => b.date.localeCompare(a.date)),
    getRessourcesByMatiere: (matiereId: string) => state.ressources.filter((r) => r.matiereId === matiereId),
    getMessagesByEleve: (eleveId: string) => state.messages.filter((m) => m.eleveId === eleveId).sort((a, b) => a.date.localeCompare(b.date)),
    getBadgesByEleve: (eleveId: string) =>
      state.badgesObtenus
        .filter((b) => b.eleveId === eleveId)
        .map((b) => ({ ...state.badges.find((badge) => badge.id === b.badgeId)!, dateObtention: b.date })),
    getObjectifsByEleve: (eleveId: string) => state.objectifs.filter((o) => o.eleveId === eleveId),
    getEleve: (id: string) => state.eleves.find((e) => e.id === id),
    getElevesBySerie: (serie: Serie) => state.eleves.filter((e) => e.serie === serie),
    getParent: (id: string) => state.parents.find((p) => p.id === id),
    getBulletinsByEleve: (eleveId: string) => state.bulletins.filter((b) => b.eleveId === eleveId).sort((a, b) => b.anneeScolaire.localeCompare(a.anneeScolaire)),
    getPassageByEleve: (eleveId: string, anneeScolaire: string) =>
      state.passagesClasse.find((p) => p.eleveId === eleveId && p.anneeScolaire === anneeScolaire),
    getSuggestionsByEleve: (eleveId: string) => state.suggestionsReorientation.filter((s) => s.eleveId === eleveId),
    getResultatBacByEleve: (eleveId: string) => state.resultatsBac.find((r) => r.eleveId === eleveId),
    getMoyennesParMatiere: (eleveId: string, anneeScolaire: string) => {
      const eleve = state.eleves.find((e) => e.id === eleveId);
      if (!eleve) return [];
      return eleve.matiereIds
        .map((matiereId) => {
          const notes = state.evaluations.filter(
            (e) => e.eleveId === eleveId && e.matiereId === matiereId && e.anneeScolaire === anneeScolaire && e.note !== null
          );
          if (notes.length === 0) return null;
          const moyenne = Math.round((notes.reduce((acc, e) => acc + (e.note ?? 0), 0) / notes.length) * 10) / 10;
          return { matiereId, moyenne };
        })
        .filter((m): m is { matiereId: string; moyenne: number } => m !== null);
    },

    // --- actions ---
    toggleMatiereStatut: async (id: string) => {
      const current = state.matieres.find((m) => m.id === id);
      if (!current) return;
      const statut = current.statut === "actif" ? "inactif" : "actif";
      const supabase = requireOnlineClient();
      const { error } = await supabase.from("matieres").update({ statut }).eq("id", id);
      if (error) return;
      store.setState((prev) => ({ ...prev, matieres: prev.matieres.map((m) => (m.id === id ? { ...m, statut } : m)) }));
    },
    addMatiere: async (matiere: Omit<Matiere, "id">) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase.from("matieres").insert(matiere).select().single();
      if (error || !data) throw error ?? new Error("addMatiere: no data returned");
      const created = mapMatiere(data);
      store.setState((prev) => ({ ...prev, matieres: [...prev.matieres, created] }));
      return created;
    },

    addExercice: async (exercice: Omit<Exercice, "id">) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase
        .from("exercices")
        .insert({
          matiere_id: exercice.matiereId,
          type: exercice.type,
          titre: exercice.titre,
          consigne: exercice.consigne,
          createur: exercice.createur,
          createur_id: exercice.createurId,
          questions: exercice.questions ?? null,
          enonce: exercice.enonce ?? null,
          dans_bibliotheque: exercice.dansBibliotheque,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("addExercice: no data returned");
      const created = mapExercice(data);
      store.setState((prev) => ({ ...prev, exercices: [created, ...prev.exercices] }));
      return created;
    },

    addAssignation: async (assignation: Omit<Assignation, "id">) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase
        .from("assignations")
        .insert({
          exercice_id: assignation.exerciceId,
          repetiteur_assignant_id: assignation.repetiteurAssignantId,
          date_assignation: assignation.dateAssignation,
          date_echeance: assignation.dateEcheance,
          statut: assignation.statut,
          score: assignation.score ?? null,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("addAssignation: no data returned");
      if (assignation.eleveIds.length > 0) {
        const { error: joinError } = await supabase
          .from("assignation_eleves")
          .insert(assignation.eleveIds.map((eleveId) => ({ assignation_id: data.id, eleve_id: eleveId })));
        if (joinError) throw joinError;
      }
      const created: Assignation = { ...mapAssignation(data), eleveIds: assignation.eleveIds };
      store.setState((prev) => ({ ...prev, assignations: [created, ...prev.assignations] }));
      return created;
    },
    updateAssignation: async (id: string, patch: Partial<Assignation>) => {
      const supabase = requireOnlineClient();
      const payload: Row = {};
      if (patch.exerciceId !== undefined) payload.exercice_id = patch.exerciceId;
      if (patch.repetiteurAssignantId !== undefined) payload.repetiteur_assignant_id = patch.repetiteurAssignantId;
      if (patch.dateAssignation !== undefined) payload.date_assignation = patch.dateAssignation;
      if (patch.dateEcheance !== undefined) payload.date_echeance = patch.dateEcheance;
      if (patch.statut !== undefined) payload.statut = patch.statut;
      if (patch.score !== undefined) payload.score = patch.score;
      const { error } = await supabase.from("assignations").update(payload).eq("id", id);
      if (error) return;
      store.setState((prev) => ({ ...prev, assignations: prev.assignations.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
    },

    addSoumission: async (soumission: Omit<Soumission, "id">) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase
        .from("soumissions")
        .insert({
          assignation_id: soumission.assignationId,
          eleve_id: soumission.eleveId,
          reponse_qcm: soumission.reponseQcm ?? null,
          reponse_libre: soumission.reponseLibre ?? null,
          date: soumission.date,
          statut: soumission.statut,
          score_auto: soumission.scoreAuto ?? null,
          score_final: soumission.scoreFinal ?? null,
          commentaire_correction: soumission.commentaireCorrection ?? null,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("addSoumission: no data returned");
      const created = mapSoumission(data);
      store.setState((prev) => ({ ...prev, soumissions: [...prev.soumissions, created] }));
      return created;
    },
    updateSoumission: async (id: string, patch: Partial<Soumission>) => {
      const supabase = requireOnlineClient();
      const payload: Row = {};
      if (patch.reponseQcm !== undefined) payload.reponse_qcm = patch.reponseQcm;
      if (patch.reponseLibre !== undefined) payload.reponse_libre = patch.reponseLibre;
      if (patch.statut !== undefined) payload.statut = patch.statut;
      if (patch.scoreAuto !== undefined) payload.score_auto = patch.scoreAuto;
      if (patch.scoreFinal !== undefined) payload.score_final = patch.scoreFinal;
      if (patch.commentaireCorrection !== undefined) payload.commentaire_correction = patch.commentaireCorrection;
      const { error } = await supabase.from("soumissions").update(payload).eq("id", id);
      if (error) return;
      store.setState((prev) => ({ ...prev, soumissions: prev.soumissions.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
    },

    updateSeance: async (id: string, patch: Partial<Seance>) => {
      const supabase = requireOnlineClient();
      const payload: Row = {};
      if (patch.date !== undefined) payload.date = patch.date;
      if (patch.heureDebut !== undefined) payload.heure_debut = patch.heureDebut;
      if (patch.heureFin !== undefined) payload.heure_fin = patch.heureFin;
      if (patch.lieu !== undefined) payload.lieu = patch.lieu;
      if (patch.statut !== undefined) payload.statut = patch.statut;
      if (patch.contenu !== undefined) payload.contenu = patch.contenu;
      if (patch.present !== undefined) payload.present = patch.present;
      const { error } = await supabase.from("seances").update(payload).eq("id", id);
      if (error) return;
      store.setState((prev) => ({ ...prev, seances: prev.seances.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
    },

    addEvaluation: async (evaluation: Omit<Evaluation, "id">) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase
        .from("evaluations")
        .insert({
          eleve_id: evaluation.eleveId,
          repetiteur_id: evaluation.repetiteurId,
          matiere_id: evaluation.matiereId,
          date: evaluation.date,
          note: evaluation.note,
          remarque: evaluation.remarque,
          visible_eleve: evaluation.visibleEleve,
          annee_scolaire: evaluation.anneeScolaire,
          sequence_id: evaluation.sequenceId,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("addEvaluation: no data returned");
      const created = mapEvaluation(data);
      store.setState((prev) => ({ ...prev, evaluations: [created, ...prev.evaluations] }));
      return created;
    },

    addMessage: async (message: Omit<Message, "id">) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase
        .from("messages")
        .insert({
          eleve_id: message.eleveId,
          repetiteur_id: message.repetiteurId,
          auteur: message.auteur,
          contenu: message.contenu,
          date: message.date,
          lu: message.lu,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("addMessage: no data returned");
      const created = mapMessage(data);
      store.setState((prev) => ({ ...prev, messages: [...prev.messages, created] }));
      return created;
    },

    addDemandeAide: async (demande: Omit<DemandeAide, "id">) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase
        .from("demandes_aide")
        .insert({
          eleve_id: demande.eleveId,
          matiere_id: demande.matiereId,
          sujet: demande.sujet,
          date: demande.date,
          statut: demande.statut,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("addDemandeAide: no data returned");
      const created = mapDemandeAide(data);
      store.setState((prev) => ({ ...prev, demandesAide: [created, ...prev.demandesAide] }));
      return created;
    },

    addAutoEvaluation: async (autoEvaluation: Omit<AutoEvaluation, "id">) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase
        .from("auto_evaluations")
        .insert({
          eleve_id: autoEvaluation.eleveId,
          seance_id: autoEvaluation.seanceId,
          moment: autoEvaluation.moment,
          chapitre: autoEvaluation.chapitre,
          ressenti: autoEvaluation.ressenti,
          date: autoEvaluation.date,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("addAutoEvaluation: no data returned");
      const created = mapAutoEvaluation(data);
      store.setState((prev) => ({ ...prev, autoEvaluations: [created, ...prev.autoEvaluations] }));
      return created;
    },

    addPaiement: async (paiement: Omit<Paiement, "id">) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase
        .from("paiements")
        .insert({
          parent_id: paiement.parentId,
          eleve_id: paiement.eleveId,
          montant: paiement.montant,
          date: paiement.date,
          motif: paiement.motif,
          statut: paiement.statut,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("addPaiement: no data returned");
      const created = mapPaiement(data);
      store.setState((prev) => ({ ...prev, paiements: [created, ...prev.paiements] }));
      return created;
    },
    // La confirmation elle-même passe par la RPC confirmer_paiement_mock
    // (voir lib/paiements-mobile-money.ts) — cette action ne fait que
    // réconcilier l'état local une fois cet appel réussi.
    marquerPaiementConfirme: (id: string) => {
      store.setState((prev) => ({
        ...prev,
        paiements: prev.paiements.map((p) => (p.id === id ? { ...p, statut: "paye" } : p)),
      }));
    },

    // --- élève / parent ---
    updatePreferencesNotification: async (parentId: string, patch: Partial<PreferencesNotification>) => {
      const supabase = requireOnlineClient();
      const payload: Row = {};
      if (patch.notes !== undefined) payload.pref_notif_notes = patch.notes;
      if (patch.absences !== undefined) payload.pref_notif_absences = patch.absences;
      if (patch.remarques !== undefined) payload.pref_notif_remarques = patch.remarques;
      if (patch.paiements !== undefined) payload.pref_notif_paiements = patch.paiements;
      if (patch.frequence !== undefined) payload.pref_notif_frequence = patch.frequence;
      const { error } = await supabase.from("parents").update(payload).eq("id", parentId);
      if (error) return;
      store.setState((prev) => ({
        ...prev,
        parents: prev.parents.map((p) =>
          p.id === parentId ? { ...p, preferencesNotification: { ...p.preferencesNotification, ...patch } } : p
        ),
      }));
    },
    accepterConsentement: async (parentId: string) => {
      const supabase = requireOnlineClient();
      const acceptedAt = new Date().toISOString();
      const { error } = await supabase.from("parents").update({ consentement_accepte_at: acceptedAt }).eq("id", parentId);
      if (error) throw error;
      store.setState((prev) => ({
        ...prev,
        parents: prev.parents.map((p) => (p.id === parentId ? { ...p, consentementAccepteAt: acceptedAt } : p)),
      }));
    },
    updateEleve: async (id: string, patch: Partial<Eleve>) => {
      const supabase = requireOnlineClient();
      const payload: Row = {};
      if (patch.classe !== undefined) payload.classe = CLASSE_APP_TO_DB[patch.classe];
      if (patch.serie !== undefined) payload.serie = patch.serie;
      if (patch.styleApprentissage !== undefined) payload.style_apprentissage = patch.styleApprentissage;
      if (patch.avatarInitiales !== undefined) payload.avatar_initiales = patch.avatarInitiales;
      if (patch.dateEntree !== undefined) payload.date_entree = patch.dateEntree;
      if (patch.classeEntree !== undefined) payload.classe_entree = CLASSE_APP_TO_DB[patch.classeEntree];
      if (patch.historiqueExterne !== undefined) payload.historique_externe = patch.historiqueExterne;
      if (patch.statutCompte !== undefined) payload.statut_compte = patch.statutCompte;
      const { error } = await supabase.from("eleves").update(payload).eq("id", id);
      if (error) return;
      store.setState((prev) => ({ ...prev, eleves: prev.eleves.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
    },
    assignerMatiereEleve: async (eleveId: string, matiereId: string, assigner: boolean) => {
      const supabase = requireOnlineClient();
      if (assigner) {
        const { error } = await supabase.from("eleve_matieres").insert({ eleve_id: eleveId, matiere_id: matiereId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("eleve_matieres").delete().eq("eleve_id", eleveId).eq("matiere_id", matiereId);
        if (error) throw error;
      }
      store.setState((prev) => ({
        ...prev,
        eleves: prev.eleves.map((e) =>
          e.id === eleveId
            ? { ...e, matiereIds: assigner ? [...e.matiereIds, matiereId] : e.matiereIds.filter((m) => m !== matiereId) }
            : e
        ),
      }));
    },
    evaluerBadges: async (eleveId: string) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase.rpc("evaluer_badges", { p_eleve_id: eleveId });
      if (error || !data) return [] as string[];
      const nouveauxCodes = data as string[];
      if (nouveauxCodes.length === 0) return [];
      const aujourdHui = new Date().toISOString().slice(0, 10);
      store.setState((prev) => {
        const nouveauxBadges = prev.badges
          .filter((b) => nouveauxCodes.includes(b.code))
          .map((b) => ({ badgeId: b.id, eleveId, date: aujourdHui }));
        return { ...prev, badgesObtenus: [...prev.badgesObtenus, ...nouveauxBadges] };
      });
      return nouveauxCodes;
    },

    // --- §2.4 fin d'année ---
    addBulletin: async (bulletin: Omit<Bulletin, "id">) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase
        .from("bulletins")
        .insert({
          eleve_id: bulletin.eleveId,
          annee_scolaire: bulletin.anneeScolaire,
          moyenne_generale: bulletin.moyenneGenerale,
          appreciation_generale: bulletin.appreciationGenerale,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("addBulletin: no data returned");
      if (bulletin.moyennesParMatiere.length > 0) {
        const { error: joinError } = await supabase.from("bulletin_moyennes").insert(
          bulletin.moyennesParMatiere.map((m) => ({ bulletin_id: data.id, matiere_id: m.matiereId, moyenne: m.moyenne }))
        );
        if (joinError) throw joinError;
      }
      const created: Bulletin = { ...mapBulletin(data), moyennesParMatiere: bulletin.moyennesParMatiere };
      store.setState((prev) => ({ ...prev, bulletins: [created, ...prev.bulletins] }));
      return created;
    },
    addPassageClasse: async (passage: Omit<PassageClasse, "id">) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase
        .from("passages_classe")
        .insert({
          eleve_id: passage.eleveId,
          annee_scolaire: passage.anneeScolaire,
          classe_actuelle: CLASSE_APP_TO_DB[passage.classeActuelle],
          classe_suivante: CLASSE_APP_TO_DB[passage.classeSuivante],
          statut: passage.statut,
          moyenne_generale: passage.moyenneGenerale,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("addPassageClasse: no data returned");
      const created = mapPassageClasse(data);
      store.setState((prev) => ({ ...prev, passagesClasse: [created, ...prev.passagesClasse] }));
      return created;
    },
    validerPassage: async (id: string) => {
      const passage = state.passagesClasse.find((p) => p.id === id);
      if (!passage) return;
      const supabase = requireOnlineClient();
      const { error: passageError } = await supabase.from("passages_classe").update({ statut: "valide" }).eq("id", id);
      if (passageError) return;
      const { error: eleveError } = await supabase
        .from("eleves")
        .update({ classe: CLASSE_APP_TO_DB[passage.classeSuivante] })
        .eq("id", passage.eleveId);
      if (eleveError) return;
      store.setState((prev) => ({
        ...prev,
        passagesClasse: prev.passagesClasse.map((p) => (p.id === id ? { ...p, statut: "valide" } : p)),
        eleves: prev.eleves.map((e) => (e.id === passage.eleveId ? { ...e, classe: passage.classeSuivante } : e)),
      }));
    },
    addSuggestionReorientation: async (suggestion: Omit<SuggestionReorientation, "id">) => {
      const supabase = requireOnlineClient();
      const { data, error } = await supabase
        .from("suggestions_reorientation")
        .insert({
          eleve_id: suggestion.eleveId,
          annee_scolaire: suggestion.anneeScolaire,
          serie_actuelle: suggestion.serieActuelle,
          serie_suggeree: suggestion.serieSuggeree,
          motif: suggestion.motif,
          transmise_au_parent: suggestion.transmiseAuParent,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("addSuggestionReorientation: no data returned");
      const created = mapSuggestion(data);
      store.setState((prev) => ({ ...prev, suggestionsReorientation: [created, ...prev.suggestionsReorientation] }));
      return created;
    },
    transmettreSuggestion: async (id: string) => {
      const supabase = requireOnlineClient();
      const { error } = await supabase.from("suggestions_reorientation").update({ transmise_au_parent: true }).eq("id", id);
      if (error) return;
      store.setState((prev) => ({
        ...prev,
        suggestionsReorientation: prev.suggestionsReorientation.map((s) => (s.id === id ? { ...s, transmiseAuParent: true } : s)),
      }));
    },
    appliquerReorientation: async (eleveId: string, serie: Serie) => {
      const supabase = requireOnlineClient();
      const { error } = await supabase.from("eleves").update({ serie }).eq("id", eleveId);
      if (error) return;
      store.setState((prev) => ({ ...prev, eleves: prev.eleves.map((e) => (e.id === eleveId ? { ...e, serie } : e)) }));
    },

    // --- §2.6 sortie ---
    addResultatBac: async (resultat: ResultatBac) => {
      const supabase = requireOnlineClient();
      const { error } = await supabase.from("resultats_bac").insert({
        eleve_id: resultat.eleveId,
        annee_scolaire: resultat.anneeScolaire,
        obtenu: resultat.obtenu,
        mention: resultat.mention ?? null,
      });
      if (error) throw error;
      store.setState((prev) => ({ ...prev, resultatsBac: [resultat, ...prev.resultatsBac] }));
    },
    marquerDiplome: async (eleveId: string) => {
      const supabase = requireOnlineClient();
      const { error } = await supabase.from("eleves").update({ statut_compte: "diplome" }).eq("id", eleveId);
      if (error) return;
      store.setState((prev) => ({ ...prev, eleves: prev.eleves.map((e) => (e.id === eleveId ? { ...e, statutCompte: "diplome" } : e)) }));
    },
  };
}
