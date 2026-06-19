# Development stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm@9.15.2 && pnpm config set store-dir /pnpm-store && pnpm config set network-concurrency 15
RUN --mount=type=cache,id=pnpm,target=/pnpm-store pnpm install

# Copy source code
COPY . .

# Expose Vite port
EXPOSE 5173

# Start dev server with host flag for network access
CMD ["pnpm", "run", "dev", "--", "--host"]