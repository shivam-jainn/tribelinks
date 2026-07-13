# 1. Base stage for shared system dependencies and workspace config
FROM node:20-alpine AS base
WORKDIR /usr/src/app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* tsconfig.json ./
COPY packages/queue/package.json ./packages/queue/
COPY packages/core/package.json ./packages/core/
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/server/package.json ./apps/server/

# 2. Dependencies stage (installs all dependencies including dev)
FROM base AS dependencies
RUN --mount=type=cache,target=/root/.npm npm ci

# 3. Build stage (copies source code and builds target files)
FROM dependencies AS build
COPY packages ./packages
COPY apps ./apps
RUN npm run build

# 4. Production-only dependencies stage
FROM base AS prod-dependencies
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# 5. Development stage
FROM dependencies AS development
COPY packages ./packages
COPY apps ./apps
EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace=apps/server"]

# 6. Production runner stage (keeps the final image tiny)
FROM node:20-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy built code
COPY --from=build /usr/src/app/package.json ./
COPY --from=build /usr/src/app/tsconfig.json ./
COPY --from=build /usr/src/app/packages ./packages
COPY --from=build /usr/src/app/apps/server/dist ./apps/server/dist
COPY --from=build /usr/src/app/apps/server/package.json ./apps/server/

# Copy only production dependencies
COPY --from=prod-dependencies /usr/src/app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=apps/server"]
