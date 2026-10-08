# ==============================================================================
# GrievanceHUB Production Multi-Stage Dockerfile
# ==============================================================================

# Stage 1: Build the React 19 Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Python Production Environment
FROM python:3.11-slim AS production

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=3000 \
    DEBUG=False

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend codebase and ML artifacts
COPY backend /app/backend
COPY ml /app/ml
COPY data /app/data
COPY metadata.json /app/
COPY package*.json /app/
COPY vite.config.js /app/
COPY src /app/src
COPY index.html /app/

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/dist /app/dist

# Install Node production server dependencies if needed
RUN npm ci

EXPOSE 3000 8005

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8005/api/health/ || exit 1

# Start the unified server (Backend on 8005, Frontend on 3000)
CMD ["npm", "run", "dev"]
