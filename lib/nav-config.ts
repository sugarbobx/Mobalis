import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Home,
  Library,
  LayoutDashboard,
  MessageSquare,
  NotebookPen,
  PenLine,
  TrendingUp,
  UserCircle,
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
    { label: "Matières", href: "/admin/subjects", icon: BookOpen },
    { label: "Bibliothèque d'exercices", href: "/admin/exercises", icon: Library },
    { label: "Fin d'année", href: "/admin/fin-annee", icon: GraduationCap },
  ],
  tutor: [
    { label: "Cahier de texte", href: "/tutor", icon: NotebookPen },
    { label: "Exercices", href: "/tutor/exercises", icon: ClipboardList },
    { label: "Corrections en attente", href: "/tutor/corrections", icon: ClipboardCheck },
  ],
  parent: [{ label: "Suivi de mon enfant", href: "/parent", icon: TrendingUp }],
  student: [
    { label: "Aujourd'hui", href: "/student", icon: Home },
    { label: "Emploi du temps", href: "/student/schedule", icon: Calendar },
    { label: "Devoirs", href: "/student/homework", icon: CheckSquare },
    { label: "Exercices", href: "/student/exercises", icon: PenLine },
    { label: "Notes & objectifs", href: "/student/grades", icon: TrendingUp },
    { label: "Ressources", href: "/student/resources", icon: Library },
    { label: "Messagerie", href: "/student/messages", icon: MessageSquare },
    { label: "Profil", href: "/student/profile", icon: UserCircle },
  ],
};
