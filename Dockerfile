# Stage 1: Build the React frontend
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies + better-sqlite3 build tools
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev && apk del python3 make g++

# Copy server code and built frontend
COPY server/ ./server/
COPY scripts/ ./scripts/
COPY --from=builder /app/client/dist ./client/dist

# Create db directory (will be mounted as volume)
RUN mkdir -p server/db

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
