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

   Les `Jenkinsfile` du dépôt **n’exigent plus** le plugin **NodeJS** : ils utilisent `node` et `npm` déjà présents sur le **PATH** de l’agent (idéalement **Node 22.x**). Tu peux quand même installer le plugin NodeJS et déclarer un outil nommé `nodejs-22` si tu préfères gérer Node depuis Jenkins.

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

## 7. Livrables / captures demandées (à faire sur votre Jenkins)

| Livrable | Comment l’obtenir |
|----------|-------------------|
| Capture **CI SUCCESS** | Après un run vert : écran du job CI → build numéroté → **Console Output** ou vue Blue Ocean. |
| Capture **CD déclenché automatiquement** | Ouvrir le job CD : le build doit indiquer « Started by upstream project … » ou apparaître juste après le CI dans l’historique. |
| **Logs des tests** | Dans la console du build CI : recherche `>>> npm run test:cov:ci` ; section JUnit dans la page du build. |
| **Preuve d’échec si test KO** | Sur une branche de test : introduire `expect(true).toBe(false)` dans un `*.spec.ts` / `*.test.ts`, pousser, lancer le CI → build **FAILURE** ; capture console montrant le test en échec. |

---

## 8. Cohabitation avec GitHub Actions

Ce dépôt contient déjà des workflows dans `.github/workflows/`. Jenkins et GitHub Actions peuvent coexister (Jenkins pour un lab / serveur interne, GitHub pour le dépôt public). Les commandes npm et les chemins sont alignés entre les deux.

---

## Résumé

- **4 jobs Jenkins** : 2 CI (`Jenkinsfile`) + 2 CD (`Jenkinsfile.cd`), chemins dans les sous-dossiers réels du repo.  
- **Tests bloquants** + **couverture** via `npm run test:cov:ci`.  
- **CD automatique** après CI stable grâce au déclencheur **Build after other projects**.  
- **Jenkins Docker** : `docker-compose.jenkins.yml` à la racine.
