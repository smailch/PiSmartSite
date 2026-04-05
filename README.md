# SmartSite CRUD

Plateforme full-stack pour la gestion de projets de construction/maintenance. Le frontend propose un tableau de bord (projets, taches, ressources, planning, rapports) et le backend expose une API REST NestJS pour la persistence MongoDB.

## Points forts
- Gestion des projets, taches, ressources, budgets, documents et equipe.
- Planning Gantt et visualisations.
- API REST modulaire (Jobs, Projects, Resources, Tasks, Users).
- Generation de taches assistee par IA (optionnel, OpenRouter/Gemini).

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

## Structure du depot
```
PiSmartSite/
├── smarsite-frontend/     # Next.js + React
├── smartsite-backend/     # API NestJS
├── smartsite-ai-service/  # FastAPI + YOLO — analyse sécurité (casque / gilet) sur photos d’avancement job
├── .gitignore
└── README.md
```

## Prerequis
- Node.js 18+ (recommande)
- pnpm (optionnel) ou npm
- MongoDB (local ou Atlas)

## Installation rapide

### Frontend
```
cd smarsite-frontend
pnpm install
pnpm dev
```

### Backend
```
cd smartsite-backend
npm install
npm run start:dev
```

Frontend: http://localhost:3000
Backend: http://localhost:3200

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

### Frontend (smarsite-frontend/.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3200
OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=meta-llama/llama-3-8b-instruct
REACT_APP_GEMINI_API_KEY=your_key
```

Notes:
- OPENROUTER_API_KEY et OPENROUTER_MODEL sont utilises pour la generation de taches (optionnel).
- REACT_APP_GEMINI_API_KEY est utilise par la route de debug Gemini (optionnel).

### Backend
- La connexion MongoDB est actuellement definie en dur dans le module principal.
- La migration de taches supporte les variables MONGODB_URI, MONGO_URI ou SMARTSITE_MONGODB_URI.

## Scripts utiles

### Frontend (smarsite-frontend)
- dev: `npm run dev`
- build: `npm run build`
- start: `npm run start`
- lint: `npm run lint`

### Backend (smartsite-backend)
- dev: `npm run start:dev`
- build: `npm run build`
- start: `npm run start`
- start:prod: `npm run start:prod`
- lint: `npm run lint`
- format: `npm run format`
- test: `npm run test`
- test:e2e: `npm run test:e2e`
- migration taches: `npm run migrate:tasks:dates`

## Bonnes pratiques
- Eviter de commiter les secrets (.env).
- Externaliser la chaine de connexion MongoDB avant un deploiement.
- Verifier la configuration CORS selon votre domaine.

## Support
Ouvrir une issue ou contacter l equipe projet pour toute question.
