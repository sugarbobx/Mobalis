"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/utils/supabase/client";
import { exercicesSeed } from "./mock/exercices";
import { assignationsSeed } from "./mock/assignations";
import { soumissionsSeed } from "./mock/soumissions";
import { seancesSeed } from "./mock/seances";
import { evaluationsSeed } from "./mock/evaluations";
import { messagesSeed, demandesAideSeed } from "./mock/messages";
import { badgesObtenusSeed, objectifsSeed, autoEvaluationsSeed, badges } from "./mock/badges";
import { eleves as elevesSeed, parentsSeed } from "./mock/utilisateurs";
import type {
  Matiere,
  Exercice,
  Assignation,
  Soumission,
  Seance,
  Evaluation,
  Message,
  DemandeAide,
  BadgeObtenu,
  Objectif,
  AutoEvaluation,
  Eleve,
  Parent,
  PreferencesNotification,
  Bulletin,
  PassageClasse,
  SuggestionReorientation,
  ResultatBac,
  Serie,
} from "./mock/types";

/**
 * Single client-side source of truth for every entity the UI can create or
 * edit (subjects, exercises, assignments, submissions, sessions, grades,
 * messages, help requests, self-assessments, élèves — classe/série/statut de
 * compte, parents — préférences de notification, et les objets de fin
 * d'année : bulletins, passages de classe, suggestions de réorientation,
 * résultats du bac). Répétiteurs/admin/ressources/badge catalog ne sont
 * jamais mutés dans l'app et restent en lib/mock comme données statiques.
 *
 * matieres is the first entity migrated to Supabase (source of truth in
 * Postgres, RLS-gated) — see fetchMatieres() below. Every other entity here
 * is still in-memory + localStorage until migrated the same way. It
 * intentionally does NOT reach into Server Components — pages that need to
 * reflect these mutations are Client Components using the useStore() hook
 * below. resetDemo() restores the pristine seed data.
 */
export interface StoreState {
  matieres: Matiere[];
  exercices: Exercice[];
  assignations: Assignation[];
  soumissions: Soumission[];
  seances: Seance[];
  evaluations: Evaluation[];
  messages: Message[];
  demandesAide: DemandeAide[];
  badgesObtenus: BadgeObtenu[];
  objectifs: Objectif[];
  autoEvaluations: AutoEvaluation[];
  eleves: Eleve[];
  parents: Parent[];
  bulletins: Bulletin[];
  passagesClasse: PassageClasse[];
  suggestionsReorientation: SuggestionReorientation[];
  resultatsBac: ResultatBac[];
}

// Bump the version whenever the seed data shape changes so stale saved
// snapshots from a previous build are discarded instead of crashing the UI.
const STORAGE_KEY = "mobalis-store-v3";

function seedState(): StoreState {
  return {
    // Fetched from Supabase after mount (see fetchMatieres) — empty here so
    // server render and first client render match (no hydration mismatch).
    matieres: [],
    exercices: [...exercicesSeed],
    assignations: [...assignationsSeed],
    soumissions: [...soumissionsSeed],
    seances: [...seancesSeed],
    evaluations: [...evaluationsSeed],
    messages: [...messagesSeed],
    demandesAide: [...demandesAideSeed],
    badgesObtenus: [...badgesObtenusSeed],
    objectifs: [...objectifsSeed],
    autoEvaluations: [...autoEvaluationsSeed],
    eleves: [...elevesSeed],
    parents: [...parentsSeed],
    bulletins: [],
    passagesClasse: [],
    suggestionsReorientation: [],
    resultatsBac: [],
  };
}

function createStore(initial: StoreState) {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (updater: (prev: StoreState) => StoreState) => {
      state = updater(state);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // storage full or unavailable — the in-memory store keeps working
      }
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const store = createStore(seedState());

// The server render (and the client's hydration render) always use the seed
// data; the saved snapshot is applied in an effect after mount so the two
// renders match and React doesn't report a hydration mismatch.
let hydrateAttempted = false;
function hydrateFromStorage() {
  if (hydrateAttempted) return;
  hydrateAttempted = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<StoreState>;
    const seed = seedState();
    const complete = Object.keys(seed).every((key) => Array.isArray(saved[key as keyof StoreState]));
    if (complete) {
      store.setState(() => saved as StoreState);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Fetched once per page load; Supabase is authoritative for matieres so this
// always overwrites whatever hydrateFromStorage restored for that slice.
let matieresFetchAttempted = false;
function fetchMatieres() {
  if (matieresFetchAttempted) return;
  matieresFetchAttempted = true;
  const supabase = createClient();
  supabase
    .from("matieres")
    .select("id, nom, statut, couleur, series")
    .order("nom")
    .then(({ data, error }) => {
      if (error || !data) return;
      store.setState((prev) => ({ ...prev, matieres: data as Matiere[] }));
    });
}

export function resetDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  // matieres lives in Supabase now, not in the demo seed — preserve it.
  store.setState((prev) => ({ ...seedState(), matieres: prev.matieres }));
}

export function useStore() {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  useEffect(hydrateFromStorage, []);
  useEffect(fetchMatieres, []);

  const getMatiere = (id: string) => state.matieres.find((m) => m.id === id);
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
    getMatieresActives: (serie?: import("./mock/types").Serie) =>
      state.matieres.filter((m) => m.statut === "actif" && (!serie || m.series.includes(serie))),
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
    getMessagesByEleve: (eleveId: string) => state.messages.filter((m) => m.eleveId === eleveId).sort((a, b) => a.date.localeCompare(b.date)),
    getBadgesByEleve: (eleveId: string) =>
      state.badgesObtenus
        .filter((b) => b.eleveId === eleveId)
        .map((b) => ({ ...badges.find((badge) => badge.id === b.badgeId)!, dateObtention: b.date })),
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
      const supabase = createClient();
      const { error } = await supabase.from("matieres").update({ statut }).eq("id", id);
      if (error) return;
      store.setState((prev) => ({
        ...prev,
        matieres: prev.matieres.map((m) => (m.id === id ? { ...m, statut } : m)),
      }));
    },
    addMatiere: async (matiere: Omit<Matiere, "id">) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("matieres").insert(matiere).select().single();
      if (error || !data) throw error ?? new Error("addMatiere: no data returned");
      store.setState((prev) => ({ ...prev, matieres: [...prev.matieres, data as Matiere] }));
    },
    addExercice: (exercice: Exercice) =>
      store.setState((prev) => ({ ...prev, exercices: [exercice, ...prev.exercices] })),
    addAssignation: (assignation: Assignation) =>
      store.setState((prev) => ({ ...prev, assignations: [assignation, ...prev.assignations] })),
    updateAssignation: (id: string, patch: Partial<Assignation>) =>
      store.setState((prev) => ({
        ...prev,
        assignations: prev.assignations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      })),
    addSoumission: (soumission: Soumission) =>
      store.setState((prev) => ({ ...prev, soumissions: [...prev.soumissions, soumission] })),
    updateSoumission: (id: string, patch: Partial<Soumission>) =>
      store.setState((prev) => ({
        ...prev,
        soumissions: prev.soumissions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      })),
    updateSeance: (id: string, patch: Partial<Seance>) =>
      store.setState((prev) => ({
        ...prev,
        seances: prev.seances.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      })),
    addEvaluation: (evaluation: Evaluation) =>
      store.setState((prev) => ({ ...prev, evaluations: [evaluation, ...prev.evaluations] })),
    addMessage: (message: Message) =>
      store.setState((prev) => ({ ...prev, messages: [...prev.messages, message] })),
    addDemandeAide: (demande: DemandeAide) =>
      store.setState((prev) => ({ ...prev, demandesAide: [demande, ...prev.demandesAide] })),
    addAutoEvaluation: (autoEvaluation: AutoEvaluation) =>
      store.setState((prev) => ({ ...prev, autoEvaluations: [autoEvaluation, ...prev.autoEvaluations] })),

    // --- élève / parent ---
    updatePreferencesNotification: (parentId: string, patch: Partial<PreferencesNotification>) =>
      store.setState((prev) => ({
        ...prev,
        parents: prev.parents.map((p) =>
          p.id === parentId ? { ...p, preferencesNotification: { ...p.preferencesNotification, ...patch } } : p
        ),
      })),
    updateEleve: (id: string, patch: Partial<Eleve>) =>
      store.setState((prev) => ({
        ...prev,
        eleves: prev.eleves.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      })),

    // --- §2.4 fin d'année ---
    addBulletin: (bulletin: Bulletin) =>
      store.setState((prev) => ({ ...prev, bulletins: [bulletin, ...prev.bulletins] })),
    addPassageClasse: (passage: PassageClasse) =>
      store.setState((prev) => ({ ...prev, passagesClasse: [passage, ...prev.passagesClasse] })),
    validerPassage: (id: string) =>
      store.setState((prev) => {
        const passage = prev.passagesClasse.find((p) => p.id === id);
        if (!passage) return prev;
        return {
          ...prev,
          passagesClasse: prev.passagesClasse.map((p) => (p.id === id ? { ...p, statut: "valide" } : p)),
          eleves: prev.eleves.map((e) => (e.id === passage.eleveId ? { ...e, classe: passage.classeSuivante } : e)),
        };
      }),
    addSuggestionReorientation: (suggestion: SuggestionReorientation) =>
      store.setState((prev) => ({ ...prev, suggestionsReorientation: [suggestion, ...prev.suggestionsReorientation] })),
    transmettreSuggestion: (id: string) =>
      store.setState((prev) => ({
        ...prev,
        suggestionsReorientation: prev.suggestionsReorientation.map((s) =>
          s.id === id ? { ...s, transmiseAuParent: true } : s
        ),
      })),
    appliquerReorientation: (eleveId: string, serie: Serie) =>
      store.setState((prev) => ({
        ...prev,
        eleves: prev.eleves.map((e) => (e.id === eleveId ? { ...e, serie } : e)),
      })),

    // --- §2.6 sortie ---
    addResultatBac: (resultat: ResultatBac) =>
      store.setState((prev) => ({ ...prev, resultatsBac: [resultat, ...prev.resultatsBac] })),
    marquerDiplome: (eleveId: string) =>
      store.setState((prev) => ({
        ...prev,
        eleves: prev.eleves.map((e) => (e.id === eleveId ? { ...e, statutCompte: "diplome" } : e)),
      })),
  };
}
