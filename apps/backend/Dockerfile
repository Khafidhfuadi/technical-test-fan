# Stage 1 — Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
RUN npm install --workspace=backend
COPY apps/backend ./apps/backend
RUN npm --workspace=backend run build

# Stage 2 — Production
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package*.json ./
COPY --from=builder /app/apps/backend/prisma ./prisma
RUN npm install --production
EXPOSE 8000
CMD ["node", "dist/index.js"]
