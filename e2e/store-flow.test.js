/**
 * End-to-end regression suite for the shared client store.
 *
 * Covers the cross-role flows that used to be broken (state not propagating
 * between pages/roles), plus localStorage persistence and demo reset.
 *
 * Prerequisite: the app must be running (npm run dev or npm run start).
 *   Usage: npm run test:e2e   (BASE_URL overridable, defaults to http://localhost:3000)
 */
const { chromium } = require("playwright");

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ANNEE_SCOLAIRE_ATTENDUE = "2025-2026";
const results = [];

function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(15000);

  await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  // Start from pristine seed data so the suite is repeatable.
  await page.getByRole("button", { name: /Réinitialiser la démo/i }).click();
  await page.waitForTimeout(400);

  // --- 1. Admin deactivates a subject -> disappears from the library tabs ---
  await page.getByRole("link", { name: "Entrer dans l'espace" }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: /Matières/i }).click();
  await page.waitForTimeout(800);
  const rowAnglais = page.locator("div.flex.items-center.justify-between", { has: page.locator("text=Anglais") }).first();
  await rowAnglais.locator('[role="switch"]').click();
  await page.waitForTimeout(300);
  await page.getByRole("link", { name: /Bibliothèque d'exercices/i }).click();
  await page.waitForTimeout(800);
  check("matière désactivée retirée des onglets de la bibliothèque", (await page.getByRole("tab", { name: "Anglais" }).count()) === 0);

  // --- 2. Tutor creates a shared exercise + assigns it -> visible in admin library ---
  await page.getByRole("link", { name: "Changer d'espace" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Entrer dans l'espace" }).nth(1).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Exercices", exact: true }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /Créer un exercice/i }).click();
  await page.waitForTimeout(300);
  const titre = "Exercice e2e partagé";
  await page.fill("#titre", titre);
  await page.fill("#consigne", "Consigne e2e");
  await page.fill("#enonce", "Énoncé e2e");
  await page.locator("label", { hasText: "Partager dans la bibliothèque" }).locator('[role="checkbox"]').click();
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  await page.waitForTimeout(500);
  await page.locator("label", { hasText: "Lucas Moreau" }).locator('[role="checkbox"]').click();
  await page.getByRole("button", { name: "Assigner", exact: true }).click();
  await page.waitForTimeout(500);

  await page.getByRole("link", { name: "Changer d'espace" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Entrer dans l'espace" }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: /Bibliothèque d'exercices/i }).click();
  await page.waitForTimeout(800);
  check("exercice partagé par le répétiteur visible dans la bibliothèque admin", (await page.locator("body").innerText()).includes(titre));

  // --- 3. Student answers the QCM wrong on purpose -> real score 0/100 + correction detail ---
  await page.getByRole("link", { name: "Changer d'espace" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Entrer dans l'espace" }).nth(3).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Exercices", exact: true }).click();
  await page.waitForTimeout(800);
  await page.locator('a[href="/student/exercises/a1"]').click();
  await page.waitForTimeout(800);
  const groupes = page.locator('[role="radiogroup"]');
  const nbQuestions = await groupes.count();
  for (let g = 0; g < nbQuestions; g++) {
    const options = groupes.nth(g).locator('[role="radio"]');
    await options.nth((await options.count()) - 1).click(); // last choice is wrong for every seed question of ex1
    await page.waitForTimeout(100);
  }
  await page.getByRole("button", { name: /Valider mes réponses/i }).click();
  await page.waitForTimeout(500);
  const texteQcm = await page.locator("body").innerText();
  check("score QCM réellement calculé (toutes réponses fausses -> 0/100)", texteQcm.includes("0/100"));
  check("détail de correction affiché avec les bonnes réponses", texteQcm.includes("Bonne réponse"));

  // --- 4. Student submits the assigned libre exercise ---
  await page.getByRole("link", { name: /Retour aux exercices/i }).click();
  await page.waitForTimeout(500);
  const lienLibre = page.locator('a[href^="/student/exercises/"]:not([href="/student/exercises/a1"])').first();
  await lienLibre.click();
  await page.waitForTimeout(600);
  await page.fill("#reponse", "Réponse e2e de Lucas.");
  await page.getByRole("button", { name: /Envoyer ma réponse/i }).click();
  await page.waitForTimeout(500);
  check("soumission libre envoyée", (await page.locator("body").innerText()).includes("en attente de correction"));

  // --- 5. localStorage persistence: hard reload, state must survive ---
  await page.goto(BASE_URL + "/student/exercises/a1", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  check("état conservé après rechargement complet (localStorage)", (await page.locator("body").innerText()).includes("0/100"));

  // --- 6. Tutor sees and corrects the submission ---
  await page.goto(BASE_URL + "/tutor/corrections", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  check("soumission de l'élève dans la file de corrections du répétiteur", (await page.locator("body").innerText()).includes("Réponse e2e de Lucas."));
  await page.getByRole("button", { name: "Corriger", exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.fill("#score", "85");
  await page.fill("#commentaire", "Bon travail (e2e).");
  await page.getByRole("button", { name: /Valider la correction/i }).click();
  await page.waitForTimeout(500);
  check("correction validée visible dans « corrigées récemment »", (await page.locator("body").innerText()).includes("85/100"));

  // --- 7. Reset demo restores the seed data ---
  await page.getByRole("link", { name: "Changer d'espace" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Réinitialiser la démo/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Entrer dans l'espace" }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: /Matières/i }).click();
  await page.waitForTimeout(800);
  const switchAnglais = page
    .locator("div.flex.items-center.justify-between", { has: page.locator("text=Anglais") })
    .first()
    .locator('[role="switch"]');
  check("réinitialisation : Anglais de nouveau actif", (await switchAnglais.getAttribute("aria-checked")) === "true");

  // --- 8. QCM builder : le répétiteur construit un QCM de 2 questions, l'élève répond juste -> 100/100 ---
  await page.goto(BASE_URL + "/tutor/exercises", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /Créer un exercice/i }).click();
  await page.waitForTimeout(300);
  await page.fill("#titre", "QCM construit e2e");
  await page.fill("#consigne", "Choisis la bonne réponse.");
  // basculer le type sur QCM
  await page.locator('[role="combobox"]', { hasText: "Réponse libre" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("option", { name: "QCM" }).click();
  await page.waitForTimeout(300);
  // question 1 : bonne réponse = choix 2 (index 1)
  const carte1 = page.locator("div.rounded-lg", { has: page.locator("#question-0") });
  await page.fill("#question-0", "Combien font 2 + 2 ?");
  await carte1.getByPlaceholder("Choix 1").fill("3");
  await carte1.getByPlaceholder("Choix 2").fill("4");
  await carte1.getByPlaceholder("Choix 3").fill("5");
  await carte1.getByPlaceholder("Choix 4").fill("22");
  await carte1.locator('[aria-label="Choix 2 est la bonne réponse"]').click();
  // question 2 : bonne réponse = choix 1 (index 0, défaut)
  await page.getByRole("button", { name: /Ajouter une question/i }).click();
  await page.waitForTimeout(200);
  const carte2 = page.locator("div.rounded-lg", { has: page.locator("#question-1") });
  await page.fill("#question-1", "Combien font 10 / 2 ?");
  await carte2.getByPlaceholder("Choix 1").fill("5");
  await carte2.getByPlaceholder("Choix 2").fill("2");
  await carte2.getByPlaceholder("Choix 3").fill("20");
  await carte2.getByPlaceholder("Choix 4").fill("8");
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  await page.waitForTimeout(500);
  // l'assigner à Lucas
  await page.locator("label", { hasText: "Lucas Moreau" }).locator('[role="checkbox"]').click();
  await page.getByRole("button", { name: "Assigner", exact: true }).click();
  await page.waitForTimeout(500);

  // l'élève répond correctement
  await page.goto(BASE_URL + "/student/exercises", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.locator('a[href^="/student/exercises/"]:not([href="/student/exercises/a1"])').first().click();
  await page.waitForTimeout(800);
  const groupesQcm = page.locator('[role="radiogroup"]');
  check("QCM construit : 2 questions affichées côté élève", (await groupesQcm.count()) === 2);
  await groupesQcm.nth(0).locator('[role="radio"]').nth(1).click(); // "4"
  await page.waitForTimeout(150);
  await groupesQcm.nth(1).locator('[role="radio"]').nth(0).click(); // "5"
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: /Valider mes réponses/i }).click();
  await page.waitForTimeout(500);
  const texteFinal = await page.locator("body").innerText();
  check("QCM construit : toutes réponses justes -> 100/100", texteFinal.includes("100/100"));
  check("QCM construit : aucune correction à afficher", !texteFinal.includes("Bonne réponse :"));

  // --- 9. Fin d'année : préconisation + validation du passage de classe (Lucas, 2nde) ---
  await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /Réinitialiser la démo/i }).click();
  await page.waitForTimeout(400);
  await page.getByRole("link", { name: "Entrer dans l'espace" }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: /Fin d'année/i }).click();
  await page.waitForTimeout(800);
  // Ordre fixe des tables de la page : [0] Passage de classe, [1] Bulletins annuels, [2] Sortie/Bac.
  const tablePassage = page.locator("table").nth(0);
  const rowLucas = tablePassage.locator("tr", { has: page.locator("text=Lucas Moreau") }).first();
  await rowLucas.getByRole("button", { name: /Générer la préconisation/i }).click();
  await page.waitForTimeout(400);
  const preconisationTexte = await rowLucas.innerText();
  check("Fin d'année : préconisation générée pour Lucas (2nde)", /Préconisé|Validé/.test(preconisationTexte));
  await rowLucas.getByRole("button", { name: "Valider", exact: true }).click();
  await page.waitForTimeout(400);
  const apresValidation = await rowLucas.innerText();
  check("Fin d'année : passage validé et classe suivante affichée", apresValidation.includes("Validé"));

  // vérifie que la classe de Lucas a réellement changé (mutation propagée dans le store)
  await page.getByRole("link", { name: "Changer d'espace" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Entrer dans l'espace" }).nth(3).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Profil", exact: true }).click();
  await page.waitForTimeout(800);
  const profilTexte = await page.locator("body").innerText();
  check("Fin d'année : classe de Lucas mise à jour côté élève après validation", profilTexte.includes("1ère"));

  // --- 10. Bulletin annuel généré par l'admin, visible côté élève ---
  await page.getByRole("link", { name: "Changer d'espace" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Entrer dans l'espace" }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: /Fin d'année/i }).click();
  await page.waitForTimeout(800);
  const tableBulletins = page.locator("table").nth(1);
  const rowBulletinLucas = tableBulletins.locator("tr", { has: page.locator("text=Lucas Moreau") }).first();
  await rowBulletinLucas.getByRole("button", { name: /Générer le bulletin/i }).click();
  await page.waitForTimeout(400);

  await page.getByRole("link", { name: "Changer d'espace" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Entrer dans l'espace" }).nth(3).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: /Notes/i }).click();
  await page.waitForTimeout(800);
  const gradesTexte = await page.locator("body").innerText();
  check("Fin d'année : bulletin annuel visible côté élève", gradesTexte.includes("Bulletins annuels") && gradesTexte.includes(ANNEE_SCOLAIRE_ATTENDUE));

  // remettre la démo à zéro pour l'utilisateur
  await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /Réinitialiser la démo/i }).click();
  await page.waitForTimeout(400);

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies`);
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
