# Build : docker build -t pismartsite-backend:latest .
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# Ne jamais mettre MONGODB_URI ou d’autres secrets ici : ils finiraient dans l’image (couches + registre).
# Au run : -e MONGODB_URI=... ou --env-file (voir env.example).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# L’utilisateur node doit pouvoir écrire sous /app : multer crée ./uploads au chargement des contrôleurs.
RUN mkdir -p /app/uploads/progress-photos /app/uploads/progress /app/uploads/humans \
  && chown -R node:node /app
EXPOSE 3200
USER node
CMD ["node", "dist/main.js"]
