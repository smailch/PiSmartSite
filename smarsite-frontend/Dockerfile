# Build (remplacer l’URL par l’IP d’un nœud + NodePort backend, ex. http://192.168.56.11:30320) :
# docker build --build-arg NEXT_PUBLIC_API_URL=http://192.168.56.11:30320 -t pismartsite-frontend:latest .
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
EXPOSE 3000
USER node
# Écoute sur toutes les interfaces (requis dans le pod Kubernetes).
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
