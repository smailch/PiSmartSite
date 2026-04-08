<h1 align="center">PiSmartSite</h1>

<p align="center" style="margin: 15px;">
  <img src="https://readme-typing-svg.herokuapp.com?duration=2000&color=00BFFF&center=true&vCenter=true&width=500&lines=Plateforme+full+stack+pour+le+chantier;Gestion+de+projets+%26+t%C3%A2ches;Planning+Gantt+%2B+Kanban;Documents+%26+photos+d%E2%80%99avancement;IA+optionnelle+%28Groq%2C+Gemini%2C+OpenRouter%29" alt="Typing SVG" />
</p>

<h3 align="center">🏗️ Construction & maintenance · Projets, tâches, équipe et budget</h3>
<h3 align="center">⚡ Frontend React (Next.js) · NestJS · MongoDB · PI Full Stack JS (ESPRIT)</h3>

<p align="center">
  📚 <strong>Projet académique</strong> · Encadrante : <strong>Sassi Soumaya</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

---

<h2 align="center">À propos</h2>

<p align="center">
  Application web pour piloter des <strong>projets de construction</strong> : vue d’ensemble, <strong>tâches</strong>, <strong>ressources</strong>, <strong>budget</strong>, <strong>documents</strong>, <strong>photos d’avancement</strong> et reporting.  
  Le frontend est construit avec <strong>React</strong> dans <strong>Next.js</strong> (App Router), API <strong>NestJS</strong>, données <strong>MongoDB</strong>. Service Python <strong>FastAPI + YOLO</strong> optionnel pour l’analyse de photos de chantier.
</p>

### Fonctionnalités principales

- CRUD **projets**, **tâches**, **ressources**, **jobs** (avancement, photos), **humains**, équipement, présences
- **Gantt**, **Kanban**, rapports
- **Documents** (versions) et **progress-photos** (validation, estimation IA selon configuration)
- **IA** : analyse projet (Groq, backend), suggestions de tâches (OpenRouter / routes Next), debug Gemini (optionnel)
- API REST modulaire

---

<h1 align="center">Stack & outils 🛠</h1>

<h3 align="center">Base web</h3>
<p align="center">
    <a href="https://www.w3.org/html/" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original-wordmark.svg" alt="html5" width="50" height="50"/>
    </a>
    <a href="https://www.w3schools.com/css/" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/css3/css3-original-wordmark.svg" alt="css3" width="50" height="50"/>
    </a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" alt="javascript" width="50" height="50"/>
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" alt="typescript" width="50" height="50"/>
    </a>
</p>

<h3 align="center">Frontend</h3>
<p align="center">
    <a href="https://reactjs.org/" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original-wordmark.svg" alt="react" width="50" height="50"/>
    </a>
    <a href="https://nextjs.org/" target="_blank">
        <img src="https://cdn.worldvectorlogo.com/logos/nextjs-2.svg" alt="nextjs" width="50" height="50"/>
    </a>
</p>

<h3 align="center">Backend & données</h3>
<p align="center">
    <a href="https://nodejs.org/" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original-wordmark.svg" alt="nodejs" width="50" height="50"/>
    </a>
    <a href="https://nestjs.com/" target="_blank">
        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nestjs/nestjs-original.svg" alt="nestjs" width="50" height="50"/>
    </a>
    <a href="https://www.mongodb.com/" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/mongodb/mongodb-original-wordmark.svg" alt="mongodb" width="50" height="50"/>
    </a>
</p>

<h3 align="center">IA & service chantier (optionnel)</h3>
<p align="center">
    <a href="https://www.python.org/" target="_blank">
        <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" alt="python" width="50" height="50"/>
    </a>
    <a href="https://fastapi.tiangolo.com/" target="_blank">
        <img src="https://cdn.worldvectorlogo.com/logos/fastapi.svg" alt="fastapi" width="50" height="50"/>
    </a>
</p>

---

<h2 align="center">Architecture (résumé)</h2>

| Couche | Technologie |
|--------|-------------|
| **Frontend** | **React** + Next.js (App Router), Tailwind, Radix UI |
| **Backend** | NestJS, Mongoose |
| **IA chantier** | `smartsite-ai-service` — FastAPI, YOLO |
| **Base de données** | MongoDB |

---

<h2 align="center">Structure du dépôt</h2>

```
PiSmartSite/
├── smarsite-frontend/     # Next.js (interface React)
├── smartsite-backend/     # API NestJS
├── smartsite-ai-service/  # FastAPI + YOLO — analyse sécurité (photos d’avancement)
├── .gitignore
└── README.md
```

---

<h2 align="center">Prérequis</h2>

- Node.js **18+**
- **npm** ou pnpm
- **MongoDB** (local ou Atlas)
- Python **3.x** (uniquement pour `smartsite-ai-service`)

---

<h2 align="center">Démarrage rapide</h2>

### Frontend (React + Next.js)

```bash
cd smarsite-frontend
npm install
npm run dev
```

### Backend

```bash
cd smartsite-backend
npm install
npm run start:dev
```

- Application : [http://localhost:3000](http://localhost:3000)  
- API : [http://localhost:3200](http://localhost:3200)

### Variables d’environnement

- **Frontend** : `smarsite-frontend/.env.local` — modèle : `.env.example`
- **Backend** : `smartsite-backend/.env` — modèle : `.env.example`

### Service IA (`smartsite-ai-service`, optionnel)

```bash
cd smartsite-ai-service
python -m venv .venv
# Windows : .venv\Scripts\activate
pip install -r requirements.txt
set YOLO_MODEL_PATH=weights\best.pt
    uvicorn main:app --host 0.0.0.0 --port 8001
```

Dans `smartsite-backend/.env` : `AI_ANALYSIS_URL=http://127.0.0.1:8001/analyze-image` (voir `.env.example`).

---

<h2 align="center">Scripts utiles</h2>

| Dossier | Commandes |
|---------|-----------|
| `smarsite-frontend` | `npm run dev` · `build` · `start` · `lint` |
| `smartsite-backend` | `npm run start:dev` · `build` · `start:prod` · `lint` · `test` · `migrate:tasks:dates` |

---

<h2 align="center">Bonnes pratiques</h2>

- Ne pas commiter de **secrets** (`.env` / `.env.local` en local uniquement si besoin).
- Ajuster **CORS** et l’URI **MongoDB** selon l’environnement.

---

<p align="center">
  ⭐️ <em>PiSmartSite — PI Full Stack JS — ESPRIT</em>
</p>

<p align="center">
    <img src="https://camo.githubusercontent.com/64b973cb57806dd2b625e57e40571ce9ca4b4086d5c1ca932910cdaed296020a/68747470733a2f2f6d656469612e67697068792e636f6d2f6d656469612f7a356943766f316f4362717437756b4d51732f67697068792e676966" alt="" width="300"/>
</p>
