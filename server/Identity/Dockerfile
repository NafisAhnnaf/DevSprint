# ---------- BUILD STAGE ----------
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build


# ---------- RUNTIME STAGE ----------
FROM node:24-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

# Copy the compiled app
COPY --from=builder /usr/src/app/dist ./dist
# Copy prisma schema and migrations
COPY --from=builder /usr/src/app/prisma ./prisma
# Copy the compiled prisma.config.js (THIS IS THE KEY ADDITION)
COPY --from=builder /usr/src/app/dist/prisma.config.js ./prisma.config.js

EXPOSE 4002

# Run migrations from the root where prisma.config.js is, then run the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]