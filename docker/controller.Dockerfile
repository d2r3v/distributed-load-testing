FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

ENV PORT=5000

CMD ["npx", "ts-node", "src/controller/index.ts"]
