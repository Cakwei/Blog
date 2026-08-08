# ==========================================
# STAGE 1: Shared Base Environment
# ==========================================
FROM node:lts-alpine AS base
WORKDIR /app

# Upgrade global npm to fix vulnerabilities (e.g. 'tar')
RUN npm install -g npm@latest

# Copy package manifests first for optimal layer caching
COPY package.json package-lock.json* ./


# ==========================================
# STAGE 2: Development Environment
# ==========================================
FROM base AS development
ENV NODE_ENV=development

# Install all dependencies (including devDependencies like Vite/TanStack)
RUN npm install

# Copy application files
COPY . .

# Expose Vite/TanStack development port
EXPOSE 3000
ENV HOST=0.0.0.0
ENV PORT=3000

CMD ["npm", "run", "dev"]


# ==========================================
# STAGE 3: Production Builder
# ==========================================
FROM base AS builder
# Install all dependencies needed to run the build command
RUN npm ci

# Copy application code
COPY . .

# Build TanStack Start + Nitro application (generates .output directory)
RUN npm run build


# ==========================================
# STAGE 4: Final Production Runtime
# ==========================================
FROM node:lts-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Security Best Practice: Do not run as root user in production
USER node

# Copy ONLY the compiled standalone Nitro bundle from Stage 3
# Nitro automatically bundles production runtime dependencies into .output
COPY --from=builder --chown=node:node /app/.output ./.output

# Expose production port
EXPOSE 3000
ENV HOST=0.0.0.0
ENV PORT=3000

# Start Nitro server entry directly
CMD ["node", ".output/server/index.mjs"]