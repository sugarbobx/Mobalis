import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  BookOpenCheck,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Home,
  KeyRound,
  Layers,
  Library,
  ListChecks,
  LayoutDashboard,
  MessageSquare,
  NotebookPen,
  PenLine,
  Settings,
  Swords,
  TrendingUp,
  UserCircle,
  Users,
} from "lucide-react";
import type { Role } from "@/lib/mock";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administration",
  tutor: "Répétiteur",
  parent: "Parent",
  student: "Élève",
};

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  admin: [
    { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
    { label: "Élèves", href: "/admin/eleves", icon: GraduationCap },
    { label: "Répétiteurs", href: "/admin/repetiteurs", icon: Users },
    { label: "Matières", href: "/admin/subjects", icon: BookOpen },
    { label: "Bibliothèque d'exercices", href: "/admin/exercises", icon: Library },
    { label: "Banque QCM", href: "/admin/qcm-bank", icon: ListChecks },
    { label: "Fin d'année", href: "/admin/fin-annee", icon: GraduationCap },
    { label: "Défis — tour de contrôle", href: "/admin/challenges", icon: Swords },
    { label: "Notifications", href: "/admin/notifications", icon: Bell },
    { label: "Comptes", href: "/admin/accounts", icon: KeyRound },
    { label: "Paramètres", href: "/admin/parametres", icon: Settings },
  ],
  tutor: [
    { label: "Cahier de texte", href: "/tutor", icon: NotebookPen },
    { label: "Mes élèves", href: "/tutor/eleves", icon: TrendingUp },
    { label: "Exercices", href: "/tutor/exercises", icon: ClipboardList },
    { label: "Corrections en attente", href: "/tutor/corrections", icon: ClipboardCheck },
    { label: "Défis", href: "/tutor/challenges", icon: Swords },
    { label: "Banque de questions", href: "/tutor/questions", icon: ListChecks },
    { label: "Banque QCM", href: "/tutor/qcm-bank", icon: Layers },
    { label: "Messages", href: "/tutor/messages", icon: MessageSquare },
  ],
  parent: [{ label: "Suivi de mon enfant", href: "/parent", icon: TrendingUp }],
  student: [
    { label: "Aujourd'hui", href: "/student", icon: Home },
    { label: "Emploi du temps", href: "/student/schedule", icon: Calendar },
    { label: "Devoirs", href: "/student/homework", icon: CheckSquare },
    { label: "Exercices", href: "/student/exercises", icon: PenLine },
    { label: "Défis", href: "/student/challenges", icon: Swords },
    { label: "Révision", href: "/student/revision", icon: BookOpenCheck },
    { label: "Notes & objectifs", href: "/student/grades", icon: TrendingUp },
    { label: "Ressources", href: "/student/resources", icon: Library },
    { label: "Messagerie", href: "/student/messages", icon: MessageSquare },
    { label: "Profil", href: "/student/profile", icon: UserCircle },
  ],
};
