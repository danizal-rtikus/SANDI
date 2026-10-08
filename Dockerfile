# Stage 1: Build Frontend (Vite React)
FROM node:22-slim AS builder
WORKDIR /app

# Install client dependencies
COPY client/package*.json ./client/
RUN cd client && npm install

# Build client dist
COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Production Node.js Server
FROM node:22-slim
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy server codebase
COPY server/ ./server/

# Copy built frontend assets from builder stage
COPY --from=builder /app/client/dist ./client/dist

# Expose Express port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "server/index.js"]
