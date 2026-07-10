export type Role = "admin" | "tutor" | "parent" | "student";

export type StatutMatiere = "actif" | "inactif";

// Second cycle du secondaire général camerounais uniquement (2nde/1ère/Tle).
export type Classe = "2nde" | "1ère" | "Tle";
// 4 séries principales modélisées (sur les nombreuses séries officielles).
export type Serie = "A" | "C" | "D" | "SES";

export interface Matiere {
  id: string;
  nom: string;
  statut: StatutMatiere;
  couleur: string;
  series: Serie[]; // séries auxquelles la matière est rattachée (tronc commun = les 4)
}

export interface Admin {
  id: string;
  nom: string;
  prenom: string;
}

export interface Repetiteur {
  id: string;
  nom: string;
  prenom: string;
  matiereIds: string[];
  eleveIds: string[];
  avatarInitiales: string;
}

export interface PreferencesNotification {
  notes: boolean;
  absences: boolean;
  remarques: boolean;
  paiements: boolean;
  frequence: "immediat" | "hebdomadaire";
}

export interface Parent {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  eleveIds: string[];
  preferencesNotification: PreferencesNotification;
  /** null tant que le parent n'a pas accepté la politique de confidentialité (données de mineur). */
  consentementAccepteAt: string | null;
}

export type StatutCompteEleve = "actif" | "diplome";

export interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  classe: Classe;
  serie: Serie;
  styleApprentissage: string;
  parentIds: string[];
  repetiteurIds: string[];
  matiereIds: string[];
  avatarInitiales: string;
  // Entrée dans le système
  dateEntree: string; // ISO date — date de rentrée officielle pour un cas standard
  classeEntree: Classe; // classe au moment de l'entrée (peut différer de `classe` après un passage)
  historiqueExterne?: string; // notes/bulletin du précédent établissement (informatif, non structuré)
  // Sortie
  statutCompte: StatutCompteEleve;
}

export type StatutSeance = "a_venir" | "terminee" | "annulee";

export interface Seance {
  id: string;
  eleveId: string;
  repetiteurId: string;
  matiereId: string;
  date: string; // ISO date (yyyy-mm-dd)
  heureDebut: string; // HH:mm
  heureFin: string; // HH:mm
  lieu: string;
  statut: StatutSeance;
  contenu?: string; // cahier de texte : ce qui a été vu
  present?: boolean;
  anneeScolaire: string; // ex. "2025-2026" — support de la courbe de progression 3 ans
}

export interface Evaluation {
  id: string;
  eleveId: string;
  repetiteurId: string;
  matiereId: string;
  date: string;
  note: number | null; // /20
  remarque: string;
  visibleEleve: boolean;
  anneeScolaire: string;
  /** null pour les évaluations antérieures au système de bulletin séquentiel. */
  sequenceId: string | null;
}

export type StatutPaiement = "paye" | "en_attente" | "en_retard";

export interface Paiement {
  id: string;
  parentId: string;
  eleveId: string;
  montant: number;
  date: string;
  motif: string;
  statut: StatutPaiement;
}

// "diagnostic" : variante utilisée uniquement à l'entrée d'un nouvel élève,
// pour situer son niveau réel sans le noter formellement aux yeux du parent.
export type TypeExercice = "qcm" | "libre" | "diagnostic";
export type CreateurType = "admin" | "repetiteur";

export interface QuestionQCM {
  question: string;
  choix: string[];
  bonneReponseIndex: number;
}

export interface Exercice {
  id: string;
  matiereId: string;
  type: TypeExercice;
  titre: string;
  consigne: string;
  createur: CreateurType;
  createurId: string;
  questions?: QuestionQCM[]; // pour QCM
  enonce?: string; // pour réponse libre
  dansBibliotheque: boolean; // réutilisable par tous les répétiteurs
}

export type StatutAssignation = "a_faire" | "fait" | "corrige";

export interface Assignation {
  id: string;
  exerciceId: string;
  eleveIds: string[];
  repetiteurAssignantId: string;
  dateAssignation: string;
  dateEcheance: string;
  statut: StatutAssignation;
  score?: number;
}

export type StatutSoumission = "auto_corrige" | "en_attente_correction" | "corrige_manuellement";

export interface Soumission {
  id: string;
  assignationId: string;
  eleveId: string;
  reponseQcm?: number[]; // index choisi par question
  reponseLibre?: string;
  date: string;
  statut: StatutSoumission;
  scoreAuto?: number;
  scoreFinal?: number;
  commentaireCorrection?: string;
}

export interface Ressource {
  id: string;
  matiereId: string;
  titre: string;
  type: "cours" | "ancienne_epreuve";
  seanceId?: string;
  description: string;
}

export interface Message {
  id: string;
  eleveId: string;
  repetiteurId: string;
  auteur: "eleve" | "repetiteur";
  contenu: string;
  date: string;
  lu: boolean;
}

export interface DemandeAide {
  id: string;
  eleveId: string;
  matiereId: string;
  sujet: string;
  date: string;
  statut: "ouverte" | "traitee";
}

export interface Badge {
  id: string;
  code: string;
  nom: string;
  description: string;
  icone: string;
}

export interface BadgeObtenu {
  badgeId: string;
  eleveId: string;
  date: string;
}

export interface Objectif {
  id: string;
  eleveId: string;
  repetiteurId: string;
  matiereId: string;
  titre: string;
  progression: number; // 0-100
  dateEcheance: string;
}

export interface AutoEvaluation {
  id: string;
  eleveId: string;
  seanceId: string;
  moment: "avant" | "apres";
  chapitre: string;
  ressenti: "a_l_aise" | "pas_a_l_aise";
  date: string;
}

// --- §2.4 Transition de fin d'année ---

export interface MoyenneMatiere {
  matiereId: string;
  moyenne: number; // /20
}

export interface Bulletin {
  id: string;
  eleveId: string;
  anneeScolaire: string;
  moyennesParMatiere: MoyenneMatiere[];
  moyenneGenerale: number;
  appreciationGenerale: string;
}

export type StatutPassage = "preconise_passage" | "preconise_redoublement" | "valide";

export interface PassageClasse {
  id: string;
  eleveId: string;
  anneeScolaire: string; // année scolaire qui se termine
  classeActuelle: Classe;
  classeSuivante: Classe; // même classe si redoublement préconisé
  statut: StatutPassage;
  moyenneGenerale: number;
}

export interface SuggestionReorientation {
  id: string;
  eleveId: string;
  anneeScolaire: string;
  serieActuelle: Serie;
  serieSuggeree: Serie;
  motif: string;
  transmiseAuParent: boolean; // reste false tant que l'Admin ne l'a pas décidé
}

// --- §2.6 Sortie du système ---

export type MentionBac = "passable" | "assez_bien" | "bien" | "tres_bien";

export interface ResultatBac {
  eleveId: string;
  anneeScolaire: string;
  obtenu: boolean;
  mention?: MentionBac;
}
