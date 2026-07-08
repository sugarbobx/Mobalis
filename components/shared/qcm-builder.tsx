"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { QuestionQCM } from "@/lib/mock";

export function questionVide(): QuestionQCM {
  return { question: "", choix: ["", "", "", ""], bonneReponseIndex: 0 };
}

export function questionsValides(questions: QuestionQCM[]): boolean {
  return (
    questions.length > 0 &&
    questions.every((q) => q.question.trim().length > 0 && q.choix.every((c) => c.trim().length > 0))
  );
}

/**
 * Éditeur de questions QCM : texte de la question, choix éditables et
 * sélection de la bonne réponse via le bouton radio à gauche de chaque choix.
 */
export function QcmBuilder({
  questions,
  onChange,
}: {
  questions: QuestionQCM[];
  onChange: (questions: QuestionQCM[]) => void;
}) {
  function patchQuestion(qi: number, patch: Partial<QuestionQCM>) {
    onChange(questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  }

  function patchChoix(qi: number, ci: number, valeur: string) {
    const q = questions[qi];
    patchQuestion(qi, { choix: q.choix.map((c, i) => (i === ci ? valeur : c)) });
  }

  return (
    <div className="space-y-3">
      {questions.map((q, qi) => (
        <div key={qi} className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`question-${qi}`}>Question {qi + 1}</Label>
              <Input
                id={`question-${qi}`}
                value={q.question}
                onChange={(e) => patchQuestion(qi, { question: e.target.value })}
                placeholder="Ex. Quel est le résultat de 3 × 4 ?"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Supprimer la question ${qi + 1}`}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onChange(questions.filter((_, i) => i !== qi))}
              disabled={questions.length === 1}
            >
              <Trash2 />
            </Button>
          </div>
          <RadioGroup
            value={String(q.bonneReponseIndex)}
            onValueChange={(v) => v && patchQuestion(qi, { bonneReponseIndex: Number(v) })}
          >
            {q.choix.map((choix, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <RadioGroupItem
                  value={String(ci)}
                  aria-label={`Choix ${ci + 1} est la bonne réponse`}
                />
                <Input
                  value={choix}
                  onChange={(e) => patchChoix(qi, ci, e.target.value)}
                  placeholder={`Choix ${ci + 1}`}
                  className="h-8"
                />
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Coche le bouton à gauche de la bonne réponse.
          </p>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...questions, questionVide()])}>
        <Plus />
        Ajouter une question
      </Button>
    </div>
  );
}
