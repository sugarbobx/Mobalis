import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Politique de confidentialité — MOBALIS" };

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-16">
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
        <ArrowLeft /> Retour
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Politique de confidentialité</h1>
        <p className="text-sm text-muted-foreground">Dernière mise à jour : juillet 2026.</p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">1. Ce que nous collectons</h2>
          <p>
            Mobalis est une plateforme de gestion pour centres de répétition scolaire. Certaines données concernent des
            élèves mineurs, saisies par l&apos;administration du centre ou les répétiteurs : identité (nom, prénom, classe,
            série), résultats scolaires (notes, remarques, bulletins), présence aux séances, exercices réalisés et
            messages échangés avec les répétiteurs. Les parents fournissent leur email et leurs préférences de
            notification.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">2. Pourquoi nous les collectons</h2>
          <p>
            Ces données servent exclusivement au suivi pédagogique de l&apos;élève au sein de son centre : cahier de texte,
            notes et progression, communication entre le répétiteur et l&apos;élève, information du parent sur le
            déroulement de la scolarité. Aucune donnée n&apos;est utilisée à des fins publicitaires ou revendue à un tiers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">3. Qui peut y accéder</h2>
          <p>
            L&apos;accès est strictement cloisonné par centre et par rôle, appliqué au niveau de la base de données (pas
            seulement de l&apos;interface) :
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>l&apos;administration du centre auquel l&apos;élève est inscrit ;</li>
            <li>le ou les répétiteurs assignés à cet élève, uniquement pour leur(s) matière(s) ;</li>
            <li>le ou les parents rattachés à cet élève ;</li>
            <li>l&apos;élève lui-même, pour ses propres données.</li>
          </ul>
          <p>Un autre centre utilisant Mobalis n&apos;a techniquement aucun accès à ces données.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">4. Classements et gamification</h2>
          <p>
            Les classements de défis affichent uniquement le prénom et l&apos;initiale du nom de famille de l&apos;élève — jamais
            son nom complet, sa photo ou d&apos;autres informations identifiantes, y compris pour les autres élèves du même
            centre.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">5. Durée de conservation</h2>
          <p>
            Les données sont conservées le temps de l&apos;inscription de l&apos;élève au centre, puis pendant la durée
            nécessaire à d&apos;éventuelles obligations légales ou pédagogiques (ex. historique de bulletins). Un parent peut
            demander la suppression des données de son enfant à tout moment (voir ci-dessous).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">6. Droits du parent</h2>
          <p>
            En tant que représentant légal d&apos;un élève mineur, tu peux à tout moment demander l&apos;accès, la correction
            ou la suppression des données de ton enfant en t&apos;adressant à l&apos;administration de son centre.
            L&apos;administration traite cette demande directement dans le système.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">7. Contact</h2>
          <p>Pour toute question, adresse-toi à l&apos;administration de ton centre — c&apos;est elle qui détient et gère les données de l&apos;élève au quotidien.</p>
        </section>
      </div>
    </div>
  );
}
