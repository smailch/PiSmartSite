# SmartSite CRUD

Plateforme full-stack pour la gestion de projets de construction/maintenance. Le frontend propose un tableau de bord (projets, taches, ressources, planning, rapports) et le backend expose une API REST NestJS pour la persistence MongoDB.

## Points forts
- Gestion des projets, taches, ressources, budgets, documents et equipe.
- Planning Gantt et visualisations.
- API REST modulaire (Jobs, Projects, Resources, Tasks, Users).
- Generation de taches assistee par IA (optionnel, OpenRouter/Gemini).

## Architecture
- Frontend: Next.js 16 + React 19 + Tailwind + Radix UI.
- Backend: NestJS 11 + Mongoose.
- Base de donnees: MongoDB.

## Structure du depot
```
smartsite_crud/
  smarsite-frontend/   # Application Next.js
  smartsite-backend/   # API NestJS
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

## Variables d environnement

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
