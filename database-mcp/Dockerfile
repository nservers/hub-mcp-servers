# ==============================================================================
# nServers Official MCP Server - PostgreSQL & MySQL (SSE Transport)
# Multi-stage Dockerfile em Node.js 22 Alpine
# ==============================================================================

# 1. Dependências de Desenvolvimento e Compilação
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 2. Compilação TypeScript
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json tsconfig.json ./
COPY src ./src
RUN npm run build

# 3. Imagem Final de Execução (Enxuta & Segura)
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Executa com usuário não-root (Zero-Trust)
USER node

EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
