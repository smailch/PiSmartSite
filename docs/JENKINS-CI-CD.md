# Jenkins — CI/CD PiSmartSite (4 pipelines)

Monorepo : **NestJS** dans `smartsite-backend/`, **Next.js** dans `smarsite-frontend/` (équivalent des dossiers « backend / frontend » mentionnés dans le cahier des charges).

| Pipeline        | Fichier (Script Path dans Jenkins)     | Rôle |
|----------------|-----------------------------------------|------|
| CI Backend     | `smartsite-backend/Jenkinsfile`        | `npm ci` → tests + couverture → `npm run build` |
| CI Frontend    | `smarsite-frontend/Jenkinsfile`       | `npm ci` → tests + couverture → `npm run build` |
| CD Backend     | `smartsite-backend/Jenkinsfile.cd`     | POST vers hook de déploiement (Render, Railway, etc.) |
| CD Frontend    | `smarsite-frontend/Jenkinsfile.cd`     | POST vers hook (Vercel, Netlify, etc.) |

### Alternative : un seul job — `Jenkinsfile` à la racine

Fichier **`Jenkinsfile`** (à la racine du dépôt) : **un pipeline** en **parallèle** pour :

- `smartsite-backend` (install, tests + couverture, build),
- `smarsite-frontend` (idem),
- `smartsite-ai-service` (Python 3 sur l’agent : venv, dépendances **légères** FastAPI/Uvicorn, `compileall`, import de `main` — **sans** torch/Ultralytics pour garder la CI rapide).

Dans Jenkins : **Script Path** = `Jenkinsfile`. Les rapports JUnit restent sous `reports/junit/`.

Si un test échoue, la commande `npm run test:cov:ci` retourne un code non nul : **le stage échoue et le build est rouge**. Les logs sont horodatés (`timestamps`).

---

## 1. Installer Jenkins

### Option A — Docker (recommandé)

À la racine du dépôt :

```bash
docker compose -f docker-compose.jenkins.yml up -d
```

Interface : [http://localhost:8080](http://localhost:8080). Au premier démarrage, récupérer le mot de passe administrateur :

```bash
docker logs pismartsite-jenkins 2>&1 | findstr /i password
```

(sous Linux/macOS : `docker logs pismartsite-jenkins 2>&1 | head -n 50`)

### Option B — Machine locale

Télécharger la [LTS Jenkins](https://www.jenkins.io/download/) et suivre l’assistant d’installation.

---

## 2. Plugins et outils

1. **Manage Jenkins → Plugins → Available plugins** : installer au minimum  
   - **Git**  
   - **Pipeline**  

   Si `node` ou `python3` est absent sur l’agent, le stage **Bootstrap toolchain** met en cache **Node 22** et **CPython 3.11** (variante *install_only_stripped*, plus légère) sous `.ci-tools/` ; les deux `curl` partent **en parallèle** quand tout est à télécharger. Les builds suivants réutilisent le workspace (ou gardez le dossier de job) pour éviter de retélécharger.

   (Optionnel : **Blue Ocean** pour une UI de pipelines.)

2. **Node sur l’agent** : installe Node.js 20+ sur la machine (ou l’image Docker) qui exécute les builds, ou configure **Manage Jenkins → Tools → NodeJS** + remets un bloc `tools { nodejs 'nodejs-22' }` dans les pipelines si tu utilises ce plugin.

3. **Agents** : les `Jenkinsfile` utilisent `sh` et `curl` — privilégier un **agent Linux** (conteneur ou VM). Sur agent Windows uniquement, il faudrait adapter les étapes (`bat`, etc.).

---

## 3. Créer les 4 jobs (Pipeline depuis SCM)

Pour chaque job :

1. **New Item** → **Pipeline** → nom explicite, par ex. `PiSmartSite-CI-Backend`.
2. **Pipeline → Definition** : *Pipeline script from SCM*.
3. **SCM** : Git → URL du dépôt GitHub → credentials si privé.
4. **Branch** : `*/main` (ou votre branche).
5. **Script Path** : selon le tableau ci-dessus (ex. `smartsite-backend/Jenkinsfile`).

Répéter pour les quatre pipelines en changeant uniquement le **Script Path** et le **nom du job**.

### Variables utiles (job CI Frontend)

- Dans la configuration du job **CI Frontend**, section **Environment** (ou « Build Environment » selon version) :  
  `NEXT_PUBLIC_API_URL` = URL publique de l’API utilisée au build (ex. `https://api.example.com`).  
  Si absent, le `Jenkinsfile` utilise `http://127.0.0.1:3200` (comme le défaut documenté pour GitHub Actions).

### Secrets CD (hooks)

Pour **CD Backend** et **CD Frontend**, définir des variables d’environnement sur le job (ou des credentials « Secret text » injectés dans le pipeline) :

| Variable | Usage |
|----------|--------|
| `BACKEND_DEPLOY_HOOK_URL` | URL du deploy hook backend |
| `FRONTEND_DEPLOY_HOOK_URL` | URL du deploy hook frontend |

Si une URL est **vide**, le pipeline CD **réussit** en affichant un message de déploiement **simulé** (pratique pour un rendu sans hébergeur). Pour un CD **obligatoire**, exiger le secret et adapter le `Jenkinsfile.cd` (par exemple faire échouer le stage si la variable est absente).

---

## 4. Enchaînement CI → CD (« Build after other projects »)

1. Ouvrir le job **CD Backend** → **Configure**.
2. Section **Build Triggers** : cocher **Build after other projects are built**.
3. **Projects to watch** : nom exact du job **CI Backend** (ex. `PiSmartSite-CI-Backend`).
4. **Trigger** : **Only if build is stable** (succès).

Répéter pour **CD Frontend** en pointant vers le job **CI Frontend**.

Ainsi, un déploiement CD ne part **qu’après** un CI vert, sans dupliquer la logique de tests dans le CD.

*(Alternative : plugin **Parameterized Trigger** ou appel `build job: '...'` depuis le CI — les 4 jobs restent séparés, mais le déclencheur « Build after… » est le plus simple pour un cours DevOps.)*

---

## 5. Rapports JUnit et couverture

- Les tests backend (Jest) et frontend (Vitest) génèrent des fichiers sous `reports/junit/` à la racine du workspace ; le stage **post { junit … }** publie les résultats dans l’UI Jenkins.
- La couverture est produite par `test:cov:ci` ; les dossiers `smartsite-backend/coverage/` et `smarsite-frontend/coverage/` sont archivés en **artifacts** quand présents.

---

## 6. Vérification locale (mêmes commandes que le CI)

```bash
cd smartsite-backend
npm ci
npm run test:cov:ci
npm run build
```

```bash
cd smarsite-frontend
npm ci
npm run test:cov:ci
npm run build
```

---

## 7. SonarQube dans le pipeline (`Jenkinsfile` racine)

Le monorepo inclut **`sonar-project.properties`** (clé **`PiSmartSite`**, sources backend + frontend + `smartsite-ai-service`, LCOV fusionné `coverage/lcov.info`). Après les tests parallèles, Jenkins enchaîne :

1. **`SonarQube — fusion LCOV`** : `node scripts/sonar-prep-lcov.mjs` (réutilise les `lcov.info` produits par Jest/Vitest, sans relancer les tests).
2. **`SonarQube — analyse`** : `withCredentials` (**`sonar-token`**) + `withSonarQubeEnv('SonarQube')` + `node scripts/sonar-scan.mjs` (auth via `SONAR_SCANNER_JSON_PARAMS`, CLI `npx sonarqube-scanner`).
3. **`SonarQube — Quality Gate`** : `waitForQualityGate abortPipeline: true` — **échec du build** si le Quality Gate est **FAILED** sur le serveur SonarQube.

### 7.1 Serveur SonarQube

- Installer SonarQube (Docker, VM ou [SonarCloud](https://sonarcloud.io) en adaptant URL + token).
- Créer un **project** (ou laisser la première analyse le provisionner avec la clé `PiSmartSite`).
- **My Account → Security** : générer un **token** d’analyse.

### 7.2 Jenkins — plugins et configuration

1. **Manage Jenkins → Plugins** : installer **SonarQube Scanner** (l’étape `waitForQualityGate` fait partie de ce plugin ; un plugin « Quality Gate » séparé n’est en général pas nécessaire).
2. **Manage Jenkins → System → SonarQube servers** :
   - **Name** : `SonarQube` (**identique** au libellé dans `withSonarQubeEnv('SonarQube')` du `Jenkinsfile`).
   - **Server URL** : doit être **joignable depuis l’agent** qui exécute le pipeline (pas forcément depuis ton navigateur).
     - Jenkins **dans Docker**, SonarQube sur **l’hôte** : ne pas utiliser `http://localhost:9000` (dans le conteneur, `localhost` = le conteneur Jenkins → `ECONNREFUSED`). Utiliser par ex. :
       - **Windows / macOS (Docker Desktop)** : `http://host.docker.internal:9000`
       - **Linux** : souvent `http://172.17.0.1:9000` (passerelle du réseau `bridge`) ou l’IP LAN de la machine hôte.
     - Même URL à mettre ici **ou** laisser l’URL « interne » ici et définir sur le **job** la variable **`SONAR_HOST_URL_OVERRIDE`** avec cette URL (prioritaire pour `scripts/sonar-scan.mjs`).
   - **Server authentication token** : coller le token Sonar (credentials Jenkins) — utile pour d’autres intégrations ; **le `Jenkinsfile` du dépôt exige en plus** un Secret text dédié (voir ci‑dessous).

3. **Credential obligatoire pour le pipeline** : **Manage Jenkins → Credentials** → *Add* → **Secret text**  
   - **Secret** : le jeton généré dans SonarQube (*My Account → Security → Generate Tokens*).  
   - **ID** : exactement **`sonar-token`** (ou un autre id + variable de job `SONAR_TOKEN_CREDENTIAL_ID`).  
   Sans ce credential, l’étape `withCredentials` du stage *SonarQube — analyse* échoue : le jeton du bloc « SonarQube servers » n’est **pas** toujours injecté dans `node scripts/sonar-scan.mjs`.

**Navigateur vs Jenkins (souvent confondu)**  

- **`http://localhost:9000`** : c’est l’URL normale **sur ton PC** pour ouvrir le tableau de bord SonarQube. Garde-la pour le navigateur.
- **`http://host.docker.internal:9000`** : ce nom est surtout pour que **un processus à l’intérieur d’un conteneur Docker** (ex. Jenkins) joigne un service qui tourne **sur la machine hôte**. Sur Windows, l’ouvrir **dans Chrome/Edge** peut donner **ERR_CONNECTION_TIMED_OUT** : ce n’est pas grave, ce n’est pas le bon test.
- Pour vérifier que **Jenkins** atteint bien Sonar, depuis une console :  
  `docker exec -it pismartsite-jenkins curl -sI http://host.docker.internal:9000`  
  Si ça échoue, utilise à la place l’**adresse IPv4 de ton PC** sur le réseau local (voir `ipconfig` → « Adresse IPv4 », ex. `http://192.168.1.42:9000`) dans **`SONAR_HOST_URL_OVERRIDE`** et, si besoin, ouvre le port 9000 du pare-feu Windows pour le réseau privé. Cette même URL fonctionne souvent à la fois depuis le conteneur et depuis d’autres machines du LAN.

4. *(Option)* **Global Tool Configuration** : ajouter **SonarQube Scanner** si tu préfères le binaire Java au lieu de `npx` ; le dépôt utilise déjà `node scripts/sonar-scan.mjs` (pas d’obligation).

### 7.3 Webhook (indispensable pour `waitForQualityGate`)

Sans webhook, l’étape Quality Gate peut rester en attente ou ne pas refléter le bon statut.

- Dans **SonarQube** : **Administration → Webhooks → Create** (ou webhook au niveau projet).
- **URL** : `https://TON_JENKINS/sonarqube-webhook/` (URL affichée dans la config du serveur Sonar côté Jenkins).
- Après chaque analyse, Sonar notifie Jenkins ; `waitForQualityGate` se débloque avec **PASSED** ou **FAILED**.

### 7.4 Variables côté scanner

`scripts/sonar-scan.mjs` lit **`SONAR_TOKEN`** ou **`SONAR_AUTH_TOKEN`** (injecté par `withSonarQubeEnv`) et **`SONAR_HOST_URL`** / **`SONARQUBE_HOST`**.

### 7.5 Livrables « avant / après » (cours / rapport)

| Livrable | Où le prendre |
|----------|----------------|
| Dashboard **avant** refactoring | Projet **PiSmartSite** dans SonarQube, onglet **Overview** (capture d’écran). |
| Dashboard **après** | Même vue après correctifs ; comparer **Reliability**, **Security**, **Maintainability**, **Coverage**. |
| **Quality Gate** | Bannière sur l’overview + onglet **Quality Gates** du projet. |
| **Couverture** | Section **Measures → Coverage** (alignée sur `sonar.javascript.lcov.reportPaths`). |

---

## 8. Livrables / captures demandées (à faire sur votre Jenkins)

| Livrable | Comment l’obtenir |
|----------|-------------------|
| Capture **CI SUCCESS** | Après un run vert : écran du job CI → build numéroté → **Console Output** ou vue Blue Ocean. |
| Capture **CD déclenché automatiquement** | Ouvrir le job CD : le build doit indiquer « Started by upstream project … » ou apparaître juste après le CI dans l’historique. |
| **Logs des tests** | Dans la console du build CI : recherche `>>> npm run test:cov:ci` ; section JUnit dans la page du build. |
| **Preuve d’échec si test KO** | Sur une branche de test : introduire `expect(true).toBe(false)` dans un `*.spec.ts` / `*.test.ts`, pousser, lancer le CI → build **FAILURE** ; capture console montrant le test en échec. |

---

## 9. Cohabitation avec GitHub Actions

Ce dépôt contient déjà des workflows dans `.github/workflows/`. Jenkins et GitHub Actions peuvent coexister (Jenkins pour un lab / serveur interne, GitHub pour le dépôt public). Les commandes npm et les chemins sont alignés entre les deux.

---

## Résumé

- **4 jobs Jenkins** : 2 CI (`Jenkinsfile`) + 2 CD (`Jenkinsfile.cd`), chemins dans les sous-dossiers réels du repo.  
- **Tests bloquants** + **couverture** via `npm run test:cov:ci`.  
- **CD automatique** après CI stable grâce au déclencheur **Build after other projects**.  
- **Jenkins Docker** : `docker-compose.jenkins.yml` à la racine.  
- **SonarQube** : après CI, fusion LCOV + scan + **Quality Gate bloquant** (section 7).
