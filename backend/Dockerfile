# ---- build ----------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npx tsc

# ---- runtime --------------------------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
# Property imagery ships in the image: the vision agent and the browser are
# then provably reading the same bytes, and a scan needs no network fetch.
COPY public ./public

# Cloud Run injects PORT; 8080 is the documented default.
ENV PORT=8080
EXPOSE 8080

# Never run as root.
USER node

CMD ["node", "dist/src/server.js"]
