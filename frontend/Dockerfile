# Development stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose Vite port
EXPOSE 5173

# Start dev server with host flag for network access
CMD ["npm", "run", "dev", "--", "--host"]