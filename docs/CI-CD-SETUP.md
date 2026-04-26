# CI/CD GitHub Actions — PiSmartSite

Dépôt monorepo : **Backend** NestJS (`smartsite-backend/`), **Frontend** Next.js (`smarsite-frontend/`).

## Conformité exigences DevOps (4 pipelines, tests intégrés)

| Exigence | Statut | Réalisation |
|----------|--------|-------------|
| **2 pipelines CI** (Back / Front) | Fait | Workflows **Backend CI** et **Frontend CI** : install, tests (`npm run test:ci`), build ; échec des tests = pipeline en échec. |
| **2 pipelines CD** (Back / Front) | Fait | Jobs **Deploy backend (hook)** et **Deploy frontend (hook)** dans les mêmes fichiers, après le job de build, uniquement sur `main` / `master` (push). |
| **CD après succès du CI du même côté** | Fait | `needs: [build-and-test]` : le déploiement ne s’exécute que si le job CI a réussi. |
| **Tests unitaires Back + Front dans les pipelines** | Fait | Jest (Nest, `*.spec.ts`) et Vitest (Next, `*.test.ts` / `*.tsx` dans le périmètre du projet) via `test:ci`. L’évaluation porte sur l’**intégration** dans le pipeline, pas sur la complexité des scénarios. |

**4 pipelines au total** : il y a **2 workflows GitHub Actions** (un par stack) ; chacun contient **2 jobs** = **1 CI + 1 CD** (équivalent à 2+2 pipelines). C’est la forme recommandée pour enchaîner strictement build puis déploiement sans `workflow_run` (évite doublons dans l’historique). Si un enseignant exige **4 fichiers** `.yml` distincts, l’essentiel fonctionnel (CI+CD, ordre, tests) est déjà là ; on peut dupliquer visuellement en 4 fichiers, avec le risque de double déclenchement CD (cf. annexe historique de ce doc).

## Démarrage pas à pas (à la suite d’un test local OK)

1. **Avoir le code sur GitHub**  
   Crée un dépôt vide (sans README si tu importes un dossier existant) ou connecte le dossier :  
   `git init` (si besoin) → `git add .` → `git commit -m "chore: CI/CD"` → `git remote add origin https://github.com/TON_COMPTE/TON_REPO.git` → `git branch -M main` → `git push -u origin main`.  
   Toute la branche `main` doit contenir le dossier `.github/workflows/`.

2. **Premier run des workflows CI**  
   Sur **GitHub → Actions**, vérifie que **Backend CI** et **Frontend CI** se sont lancés sur ton dernier push. Ouvre chaque run : tout doit être vert. Si un seul a tourné, c’est le filtre `paths` (ex. seul le backend modifié). Astuce : **un seul commit** qui modifie en même temps `.github/workflows/backend-ci.yml` *et* `.github/workflows/frontend-ci.yml` déclenche **les deux** (chaque workflow surveille son YAML). Sinon, touche un fichier sous `smartsite-backend/` et un autre sous `smarsite-frontend/`.

3. **Variables (frontend)**  
   **Settings → Secrets and variables → Actions → Variables** (onglet *Repository variables*).  
   Crée `NEXT_PUBLIC_API_URL` = URL **publique** de ton API en prod (ex. `https://api.mondomaine.com`, sans `/` final si ton code l’attend comme ça). Sans ça, le build CI utilise le défaut `http://127.0.0.1:3200` (suffit pour vérifier le pipeline, pas pour coller à la vraie prod).

4. **Déploiement réel (CD)**  
   - Sur **Render / Railway** (ou autre) : crée le service **backend** (dossier `smartsite-backend`, build `npm run build`, start `node dist/main.js` ou `npm run start:prod` selon ta config). Récupère l’**URL du Deploy hook**.  
   - Sur **Vercel / Netlify** (ou autre) : importe le repo, racine `smarsite-frontend`, variables `NEXT_PUBLIC_*` comme en prod, récupère le **hook** de redéploiement.  
   Puis sur GitHub : **Settings → Secrets and variables → Actions → Secrets** :  
   `BACKEND_DEPLOY_HOOK_URL` = URL du hook backend  
   `FRONTEND_DEPLOY_HOOK_URL` = URL du hook frontend  

5. **Vérifier le CD**  
   Pousse un commit sur `main` ou `master`. Chaque **Backend CI** / **Frontend CI** comporte un job **Deploy … (hook)** *après* le job de build, uniquement sur ces branches. Vérifie sur ton hébergeur qu’un **nouveau déploiement** a été déclenché. Sur `preprod_final` (ou autre), le job *Deploy* est **ignoré** : un seul « workflow run » par app, pas de 2e workflow CD.

6. **(Option) Protéger `main`**  
   **Settings → Rules → Rulesets** (ou *Branch protection*) : exiger le passage des workflows **Backend CI** et **Frontend CI** avant merge.

7. **En cas d’échec**  
   Ouvre l’onglet **Actions** → workflow rouge → clique sur l’étape en erreur. Compare avec [la section *Vérification locale*](#vérification-locale) (mêmes commandes que dans le YAML).

## Pipelines (2 workflows, CD inclus)

| Fichier | Rôle |
|--------|------|
| `.github/workflows/backend-ci.yml` | Job *build* : `npm ci` → `lint:ci` (signal) → `test:ci` → `build` ; sur **main/master** (push), job *Deploy backend* (hook). |
| `.github/workflows/frontend-ci.yml` | Job *build* : `npm ci` → `test:ci` → `build` ; sur **main/master** (push), job *Deploy frontend* (hook). |

Plus de workflows **Backend CD** / **Frontend CD** séparés : cela évitait le double comptage (un run CI + un run *workflow_run*).

Les **tests sont obligatoires** : toute commande de test en échec fait échouer le job (pipeline rouge).

### ESLint

- **Backend** : `npm run lint:ci` est exécuté dans le CI avec `continue-on-error: true` tant que le code a une dette ESLint importante. Les **tests** et le **build** restent bloquants. Pour exiger ESLint en dur sur `main`, retire `continue-on-error` sur l’étape « ESLint » dans `backend-ci.yml` une fois les violations corrigées.
- **Frontend** : le script `lint` (`eslint .`) n’a pas `eslint` dans `package.json` et Next.js 16 ne fournit plus `next lint` dans le CLI utilisé ici. Ajoute `eslint`, `eslint-config-next` et un `eslint.config.*` si tu veux du lint en CI, ou un script `typecheck` basé sur `tsc` une fois les erreurs TypeScript corrigées.

## Déploiement (jobs *Deploy*)

- C’est le **2ᵉ job** du même fichier YAML que le CI, avec `needs: [build-and-test]`. Il ne s’exécute que sur **push** vers `main` ou `master` (les PR lancent seulement le build).
- Sur **preprod_final** : le run apparaît avec le job *Deploy* **skipped** (gris), un seul compteur « workflow run ».

### Comptage sur GitHub

Un push sur **`preprod_final` + le même sur `main`** = typiquement **4 workflow runs** (2 branches × 2 apps), pas 4 + 4 comme avec d’anciens *workflow* CD distincts. Les **16** que tu pouvais voir venaient surtout de l’ancien `workflow_run` (chaque fin de CI = nouveau workflow).

## Filtres `paths` (CI)

- Modifier uniquement le frontend ne lance **pas** le CI backend (et inversement).
- Pour forcer un run complet, toucher le fichier de workflow concerné ou un fichier sous le bon dossier.

## Secrets recommandés (déploiement par hook)

1. Ouvre **GitHub → Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Utilisé par | Description |
|--------|-------------|-------------|
| `BACKEND_DEPLOY_HOOK_URL` | Job *Deploy* du **Backend CI** | URL de **Deploy Hook** (ex. [Render](https://render.com/docs/deploys#deploy-an-image), Railway, autre) |
| `FRONTEND_DEPLOY_HOOK_URL` | Job *Deploy* du **Frontend CI** | Hook **Vercel**, **Netlify**, [Firebase](https://firebase.google.com/docs/hosting/github-integration), etc. |

- Si le secret est **absent**, le job CD **affiche un avertissement** et se termine sans erreur (tu peux configurer le hook plus tard). Pour un déploiement **obligatoire** en production, supprime le `exit 0` conditionnel ou ajoute un secret factice pour faire échouer le run tant que l’URL n’est pas posée (à adapter selon ta politique).

## Variables pour le build frontend

- **`NEXT_PUBLIC_API_URL`** : obligatoire au build (prérendu). Le workflow définit un défaut `http://127.0.0.1:3200` si la **variable de dépôt** `NEXT_PUBLIC_API_URL` est vide. Pour cibler ton API réelle en CI, crée la variable dans **Settings → Secrets and variables → Actions → Variables** (onglet *Repository variables*).
- Autres `NEXT_PUBLIC_*` : ajoute-les dans `env` du job `build-and-test` dans `frontend-ci.yml` si nécessaire.

## Branche par défaut

Adapte les branches dans les 2 YAML si ton dépôt utilise un autre nom (ex. `develop` / `preprod_final` : **CI** ; le job *Deploy* reste sur `main` / `master` via la condition `if` dans le YAML).

## Fichier `environment` (optionnel)

Tu peux réintroduire un bloc `environment: name: production` sur les jobs *Deploy* si tu veux des **règles de protection** (approbation, délais) dans GitHub Environments.

## Vérification locale

```bash
# Backend
cd smartsite-backend
npm ci
npm run lint:ci
npm run test:ci
npm run build
```

Rapport JUnit côté backend : la variable `JEST_JUNIT_OUTPUT_DIR` est définie dans GitHub Actions. En **local** (optionnel) :

```powershell
cd smartsite-backend
$env:JEST_JUNIT_OUTPUT_DIR = "..\reports\junit"
npm run test:ci
```

**Windows / `npm ci` en erreur (EPERM sur `bcrypt.node`)** : ferme l’IDE et les processus `node` qui touchent ce fichier, exclu `node_modules` de l’antivirus, ou en administrateur : `Remove-Item -Recurse -Force node_modules; npm install`.

```bash
# Frontend
cd smarsite-frontend
npm ci
npm run test:ci
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:3200"; npm run build   # PowerShell
# export NEXT_PUBLIC_API_URL=http://127.0.0.1:3200 && npm run build   # bash
```

Pour la couverture backend en local (Sonar) : ` $env:JEST_JUNIT_OUTPUT_DIR = "..\reports\junit"; npm run test:cov:ci` avant `sonar:prep` si tu veux le XML au même emplacement.

## Tests (aperçu)

- **Backend** : Jest, fichiers `*.spec.ts` sous `smartsite-backend/src/`. Exemple : `app.controller.spec.ts` (route d’accueil).
- **Frontend** : Vitest + Testing Library, fichiers `*.test.ts(x)` (ex. `components/__tests__/`, `lib/__tests__/`, routes `app/api/**/__tests__/`).
