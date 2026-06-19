FROM node:24-alpine

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm config set store-dir /pnpm-store && pnpm install

COPY . .

RUN pnpm run build

EXPOSE 4005

CMD ["node", "dist/src/index.js"]