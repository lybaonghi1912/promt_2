FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm ci --no-audit --no-fund && DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate --config prisma7.config.ts
COPY src ./src
ENV NODE_ENV=production
ENV PORT=3000
USER node
EXPOSE 3000
CMD ["node", "src/docker-start.js"]
