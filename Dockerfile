# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache optimization)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy only what's needed to run the server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Cloud Run injects PORT at runtime; default to 3000 for local testing
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:$PORT/api/health || exit 1

CMD ["node", "dist/server.cjs"]
