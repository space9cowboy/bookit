# Contexte de build : ./app (pour embarquer app/db/02_seed.sql, utilisé par POST /api/test/reset)

# --- build : compilation TypeScript
FROM node:20-alpine AS build
WORKDIR /app/api
COPY api/package.json api/package-lock.json ./
RUN npm ci
COPY api/ ./
RUN npm run build

# --- runtime : dépendances de prod + JS compilé + scripts SQL
FROM node:20-alpine
WORKDIR /app/api
ENV NODE_ENV=production
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/api/dist ./dist
COPY db /app/db
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
