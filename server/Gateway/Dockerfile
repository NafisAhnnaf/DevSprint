FROM node:24-alpine

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@9.15.2 && pnpm config set store-dir /pnpm-store && pnpm config set network-concurrency 15
RUN --mount=type=cache,id=pnpm,target=/pnpm-store pnpm install

COPY . .

RUN pnpm run build

EXPOSE 4001

CMD ["node", "dist/src/index.js"]