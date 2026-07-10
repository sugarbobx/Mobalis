"use client";

import { QuestionBank } from "@/components/shared/question-bank";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/current-user-context";

export default function TutorQuestionsPage() {
  const { getRepetiteur, getMatiere } = useStore();
  const tutorId = useCurrentUser().id;
  const tutor = getRepetiteur(tutorId);
  const mesMatieres = (tutor?.matiereIds ?? []).map((id) => getMatiere(id)).filter((m) => !!m);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Banque de questions</h1>
        <p className="text-sm text-muted-foreground">
          Tes questions alimentent les défis et la révision — limitées aux matières que tu enseignes.
        </p>
      </div>
      <QuestionBank matieresAutorisees={mesMatieres} createdBy={tutorId} />
    </div>
  );
}
