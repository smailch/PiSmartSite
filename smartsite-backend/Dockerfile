# Build: docker build -t smartsite-backend:latest ./smartsite-backend
FROM node:18-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# Secrets at runtime only (-e / Railway / Atlas), never bake into the image.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/uploads/progress-photos /app/uploads/progress /app/uploads/humans \
  && chown -R node:node /app
EXPOSE 3200
USER node
CMD ["node", "dist/main.js"]
