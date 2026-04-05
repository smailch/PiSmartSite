# Pi SmartSite

Dépôt : **[github.com/smailch/PiSmartSite](https://github.com/smailch/PiSmartSite)**

Plateforme full stack pour la gestion de projets de construction, rénovation et maintenance : tableau de bord, tâches, ressources, planning (Gantt), rapports et assistants IA.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | **React** (bibliothèque UI) avec **Next.js** (App Router, SSR/CSR, API routes) |
| **UI** | React 19, Tailwind CSS, Radix UI |
| **Backend** | NestJS, Mongoose |
| **IA chantier (optionnel)** | Service Python `smartsite-ai-service` (FastAPI, Ultralytics YOLO) — appelé par Nest pour `POST /jobs/:id/progress/photo` |
| **Base de données** | MongoDB |

Le frontend n’est pas une app React « CLI » classique seule : il est basé sur **Next.js**, qui utilise **React** pour tous les composants et l’état côté client.

## Fonctionnalités principales

- CRUD projets, tâches, ressources agrégées, jobs (liés aux tâches, avancement + IA), humains, équipement, présences
- Budget, Gantt, rapports
- **IA** : analyse projet (Groq, backend), assistant chat + rapport initial (Groq), suggestions de tâches avec dépendances (OpenRouter, route Next)
- Tableau Kanban des tâches, liens projet → board

## Structure du dépôt

```
PiSmartSite/
├── smarsite-frontend/     # Next.js + React
├── smartsite-backend/     # API NestJS
├── smartsite-ai-service/  # FastAPI + YOLO — analyse sécurité (casque / gilet) sur photos d’avancement job
├── .gitignore
└── README.md
```

## Prérequis

- **Node.js** 18+ (recommandé : LTS actuelle)
- **npm** ou **pnpm**
- **MongoDB** (local ou Atlas)

## Installation

### Backend

```bash
cd smartsite-backend
npm install
cp .env.example .env
# Éditer .env : GROQ_API_KEY, MongoDB si besoin
npm run start:dev
```

API par défaut : **http://localhost:3200**

### Service IA chantier (`smartsite-ai-service`, optionnel)

Utilisé par le backend lors de l’upload d’une **photo d’avancement** sur un job (`POST /jobs/:id/progress/photo`). Sans ce service, l’API enregistre quand même la photo mais l’analyse retombe sur un message « service indisponible ».

```bash
cd smartsite-ai-service
python -m venv .venv
# Windows : .venv\Scripts\activate
pip install -r requirements.txt
# Placer les poids YOLO (ex. weights/detect.pt) puis :
set YOLO_MODEL_PATH=weights\detect.pt
uvicorn main:app --host 0.0.0.0 --port 8001
```

Dans `smartsite-backend/.env` : `AI_ANALYSIS_URL=http://127.0.0.1:8001/analyze-image` (voir `.env.example`).

### Frontend

```bash
cd smarsite-frontend
npm install
cp .env.example .env.local
# Éditer .env.local : NEXT_PUBLIC_API_URL, OPENROUTER_API_KEY si vous utilisez les suggestions IA
npm run dev
```

Application : **http://localhost:3000**

## Clés API : rester fonctionnel sans les committer

Objectif : **le projet reste utilisable en local** avec de vraies clés, **sans jamais les pousser sur Git**.

| Mécanisme | Rôle |
|-----------|------|
| **`.env.example`** | Fichiers **versionnés** avec des **placeholders** (`your_*_key_here`) et la liste des variables. |
| **`.env` / `.env.local`** | Fichiers **ignorés par Git** où chaque développeur colle ses **vraies clés**. Copie depuis `.env.example`. |

### Règles

1. Ne **committez pas** `.env`, `.env.local` ni de fichiers contenant des secrets.
2. Après un `git clone`, faites **une copie** :  
   `cp smartsite-backend/.env.example smartsite-backend/.env`  
   `cp smarsite-frontend/.env.example smarsite-frontend/.env.local`
3. Renseignez les clés dans ces copies locales uniquement.
4. En **CI/CD** (GitHub Actions, etc.), utilisez les **secrets du dépôt** pour injecter les variables au build/runtime — pas de clés dans le code.

### Variables utiles

**Backend (`smartsite-backend/.env`)** — voir `smartsite-backend/.env.example` :

- `GROQ_API_KEY` — analyse projet + assistant (obligatoire pour ces modules)

**Frontend (`smarsite-frontend/.env.local`)** — voir `smarsite-frontend/.env.example` :

- `NEXT_PUBLIC_API_URL` — URL du backend (ex. `http://localhost:3200`)
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` — génération des tâches suggérées (optionnel)

CORS du backend est configuré pour **http://localhost:3000** ; adaptez-le pour un autre domaine en production.

## Mise à jour de la branche `main`

Pour **remplacer** l’historique actuel de `main` par cette version du dépôt local (à faire avec précaution, équipe prévenue) :

```bash
git checkout main
git pull origin main
# Sauvegarder une branche de secours si besoin : git branch backup/main-ancien
git reset --hard <commit-de-cette-version>
# ou fusion / push forcé selon votre politique
# git push origin main --force-with-lease
```

Préférez en général une **PR** ou un **merge** plutôt qu’un push forcé sur `main`, sauf décision d’équipe.

## Scripts utiles

### Frontend (`smarsite-frontend`)

| Script | Commande |
|--------|----------|
| Développement | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |

### Backend (`smartsite-backend`)

| Script | Commande |
|--------|----------|
| Développement | `npm run start:dev` |
| Build | `npm run build` |
| Tests | `npm run test` |
| Migration tâches (dates) | `npm run migrate:tasks:dates` |

## Licence / support

Projet maintenu dans [PiSmartSite](https://github.com/smailch/PiSmartSite). Ouvrez une **issue** sur le dépôt pour signaler un bug ou une évolution.
