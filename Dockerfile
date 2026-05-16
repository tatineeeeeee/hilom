FROM oven/bun:1.3.10-alpine

WORKDIR /app

# Copy workspace manifests for dependency resolution
COPY package.json bun.lock ./
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY e2e/package.json ./e2e/

# Install all deps including devDeps (tsx is needed for migrations)
RUN bun install --frozen-lockfile

# Copy server source
COPY server/ ./server/

# Compile TypeScript
RUN bun run --filter=server build

EXPOSE 4000

CMD ["sh", "-c", "bun run --filter=server db:migrate && node server/dist/index.js"]
