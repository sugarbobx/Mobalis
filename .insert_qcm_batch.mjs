import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";

const env = Object.fromEntries(
  readFileSync("C:/xampp/htdocs/Mobalis/.env.local", "utf8").split("\n").filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: matieres } = await admin.from("matieres").select("id, nom");
const matiereId = Object.fromEntries(matieres.map((m) => [m.nom, m.id]));

const { data: chapitres } = await admin.from("chapitres").select("id, matiere_id, classe, nom");
const chapitreId = new Map(chapitres.map((c) => [`${c.matiere_id}|${c.classe}|${c.nom}`, c.id]));

const { data: notions } = await admin.from("notions").select("id, chapitre_id, nom");
const notionId = new Map(notions.map((n) => [`${n.chapitre_id}|${n.nom}`, n.id]));

const { data: placeholderAdmin } = await admin.from("admins").select("id").limit(1).single();

const batchDir = process.argv[2];
if (!batchDir) { console.error("Usage: node .insert_qcm_batch.mjs <dossier-de-lots-json>"); process.exit(1); }

let totalInseres = 0, totalErreurs = 0;
const parMatiere = {};

for (const fichier of readdirSync(batchDir).filter((f) => f.endsWith(".json")).sort()) {
  const lot = JSON.parse(readFileSync(`${batchDir}/${fichier}`, "utf8"));
  for (const qcm of lot) {
    const mId = matiereId[qcm.matiere];
    if (!mId) { console.log(`SKIP matière introuvable: ${qcm.matiere}`); totalErreurs++; continue; }
    const cId = chapitreId.get(`${mId}|${qcm.classe}|${qcm.chapitre}`);
    if (!cId) { console.log(`SKIP chapitre introuvable: ${qcm.matiere}/${qcm.classe}/${qcm.chapitre}`); totalErreurs++; continue; }
    let nId = notionId.get(`${cId}|${qcm.notion}`);
    if (!nId) nId = notionId.get(`${cId}|${qcm.chapitre} — notions fondamentales`);
    if (!nId) { console.log(`SKIP notion introuvable: ${qcm.chapitre}/${qcm.notion}`); totalErreurs++; continue; }

    const { data: ex, error: exErr } = await admin.from("exercices").insert({
      matiere_id: mId,
      type: "qcm",
      titre: qcm.titre,
      consigne: "Choisis la bonne réponse.",
      createur: "admin",
      createur_id: placeholderAdmin.id,
      enonce: qcm.enonce,
      dans_bibliotheque: false,
      notion_id: nId,
      source: qcm.source ?? null,
      annee_source: qcm.annee ?? null,
      statut: "brouillon",
      centre_id: null,
    }).select("id").single();
    if (exErr || !ex) { console.log(`ERREUR insert exercice "${qcm.titre}":`, exErr?.message); totalErreurs++; continue; }

    const { error: choixErr } = await admin.from("exercice_choix").insert(
      qcm.choix.map((c, i) => ({ exercice_id: ex.id, texte_choix: c.texte, est_correct: c.correct, ordre: i + 1 }))
    );
    if (choixErr) { console.log(`ERREUR choix "${qcm.titre}":`, choixErr.message); totalErreurs++; continue; }

    const { error: diffErr } = await admin.from("exercice_difficulte_serie").insert(
      qcm.difficultes.map((d) => ({ exercice_id: ex.id, serie: d.serie, difficulte: d.difficulte }))
    );
    if (diffErr) { console.log(`ERREUR difficulté "${qcm.titre}":`, diffErr.message); totalErreurs++; continue; }

    totalInseres++;
    parMatiere[qcm.matiere] = (parMatiere[qcm.matiere] ?? 0) + 1;
  }
  console.log(`${fichier} traité.`);
}

console.log(`\nTotal inséré : ${totalInseres} (${totalErreurs} erreurs)`);
console.log("Par matière :", JSON.stringify(parMatiere, null, 1));
